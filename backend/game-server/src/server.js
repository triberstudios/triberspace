import { verifyBetterAuthToken } from "./utils/auth";
/**
 * SpaceParty - Multiplayer room for Triberspace spaces
 * Each space gets its own party instance identified by spaceId
 */
export default class SpaceParty {
    room;
    // In-memory player state (recreated on hibernation wake)
    players = new Map();
    constructor(room) {
        this.room = room;
    }
    /**
     * Called when server starts or wakes from hibernation
     */
    async onStart() {
        console.log(`🎮 Space ${this.room.id} server started`);
        // Load persistent player data from storage if needed
        const storedPlayers = await this.room.storage.get("players");
        if (storedPlayers) {
            storedPlayers.forEach(player => {
                this.players.set(player.id, player);
            });
            console.log(`📦 Loaded ${storedPlayers.length} players from storage`);
        }
    }
    /**
     * Verify authentication before allowing connection
     * This static method runs before onConnect
     */
    static async onBeforeConnect(request, lobby) {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        // Allow connections without token for development/guest mode
        if (!token) {
            console.warn("⚠️ Connection without auth token - guest mode");
            return {
                userId: "guest",
                username: "Guest"
            };
        }
        try {
            // Verify Better Auth session token
            const session = await verifyBetterAuthToken(token);
            console.log(`✅ Auth verified for ${session.user.username || session.user.email}`);
            // Store user info in connection metadata for later use
            return {
                userId: session.userId,
                username: session.user.username || session.user.email?.split('@')[0] || "User",
                email: session.user.email
            };
        }
        catch (error) {
            console.error("❌ Auth verification failed:", error);
            return new Response("Unauthorized: Invalid token", { status: 401 });
        }
    }
    /**
     * Handle new player connection
     */
    async onConnect(connection, ctx) {
        // Get user info from connection metadata (set in onBeforeConnect)
        const userId = connection.userId || "guest";
        const username = connection.username || "Guest";
        console.log(`✅ ${username} joined space ${this.room.id} (${this.players.size + 1} players)`);
        // TODO: Fetch user's active avatar from database via API
        // For now, use hardcoded default avatar
        const playerColor = this.generatePlayerColor(userId);
        // Create player state with default spawn position
        const playerState = {
            id: connection.id,
            userId,
            username,
            position: { x: 0, y: 1, z: 0 },
            rotation: 0,
            animation: "idle",
            color: playerColor,
            avatar: {
                baseModelUrl: "/assets/TriberCharacterThinner.glb",
                primaryColor: playerColor,
            },
        };
        this.players.set(connection.id, playerState);
        // Send current players to new connection
        connection.send(JSON.stringify({
            type: "playerList",
            players: Array.from(this.players.values())
        }));
        // Broadcast new player to all other connections
        this.room.broadcast(JSON.stringify({ type: "playerJoin", player: playerState }), [connection.id] // Exclude sender
        );
        // Persist to storage (optional - for room history/analytics)
        await this.persistPlayers();
    }
    /**
     * Handle incoming messages from clients
     */
    async onMessage(message, sender) {
        if (typeof message !== "string")
            return;
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case "playerUpdate":
                    await this.handlePlayerUpdate(sender.id, data);
                    break;
                case "chatMessage":
                    await this.handleChatMessage(sender.id, data);
                    break;
                default:
                    console.warn("Unknown message type:", data);
            }
        }
        catch (error) {
            console.error("Failed to process message:", error);
        }
    }
    /**
     * Handle player position/rotation updates
     */
    async handlePlayerUpdate(senderId, update) {
        const player = this.players.get(senderId);
        if (!player)
            return;
        // Update player state
        player.position = update.position;
        player.rotation = update.rotation;
        player.animation = update.animation;
        // Broadcast to all except sender (client uses optimistic updates)
        this.room.broadcast(JSON.stringify({ type: "playerUpdate", player }), [senderId]);
    }
    /**
     * Handle chat messages
     */
    async handleChatMessage(senderId, chat) {
        const player = this.players.get(senderId);
        if (!player)
            return;
        console.log(`💬 ${player.username}: ${chat.message}`);
        // Broadcast chat to everyone including sender
        this.room.broadcast(JSON.stringify({
            type: "chatMessage",
            senderId,
            userName: player.username,
            message: chat.message,
            timestamp: Date.now()
        }));
    }
    /**
     * Handle player disconnect
     */
    async onClose(connection) {
        const player = this.players.get(connection.id);
        if (player) {
            console.log(`👋 ${player.username} left space ${this.room.id} (${this.players.size - 1} remaining)`);
        }
        this.players.delete(connection.id);
        // Notify others
        this.room.broadcast(JSON.stringify({ type: "playerLeave", playerId: connection.id }));
        await this.persistPlayers();
    }
    /**
     * Persist player state to storage
     */
    async persistPlayers() {
        // Store player state for analytics/history
        await this.room.storage.put("players", Array.from(this.players.values()));
    }
    /**
     * HTTP endpoint for room info (optional - useful for debugging)
     */
    async onRequest(request) {
        if (request.method === "GET") {
            return Response.json({
                id: this.room.id,
                playerCount: this.players.size,
                players: Array.from(this.players.values()).map(p => ({
                    username: p.username,
                    position: p.position,
                    animation: p.animation
                }))
            });
        }
        return new Response("Method not allowed", { status: 405 });
    }
    /**
     * Generate a consistent color for each user
     */
    generatePlayerColor(userId) {
        // Generate color based on userId hash for consistency
        const colors = [
            "#4080ff", // Blue
            "#ff4080", // Pink
            "#40ff80", // Green
            "#ff8040", // Orange
            "#8040ff", // Purple
            "#40ffff", // Cyan
            "#ffff40", // Yellow
            "#ff40ff", // Magenta
        ];
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash = hash & hash;
        }
        return colors[Math.abs(hash) % colors.length];
    }
}
/**
 * Server options - Enable WebSocket Hibernation for cost savings
 * Hibernation mode unloads the server when idle, reducing memory costs
 */
// @ts-ignore - PartyKit options property
SpaceParty.options = {
    hibernate: true
};
