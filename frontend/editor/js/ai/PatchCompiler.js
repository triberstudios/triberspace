/**
 * PatchCompiler - Converts interaction patch nodes to executable JavaScript
 * Generates clean, optimized behavior code for React Three Fiber runtime
 */

export class PatchCompiler {
    constructor() {
        this.supportedNodes = new Set([
            'Spin',
            'Pulse',
            'ObjectRotation',
            'ObjectScale',
            'SceneObject',
            'ObjectProperty'  // Add ObjectProperty as supported target
        ]);
    }

    /**
     * Compile interaction graph to JavaScript behaviors
     * @param {Object} interactionGraph - Serialized interaction graph from editor
     * @returns {Object} Compiled behaviors with execution code
     */
    compile(interactionGraph) {
        console.log('🔧 PatchCompiler: Starting compilation', {
            hasGraph: !!interactionGraph,
            hasNodes: !!interactionGraph?.nodes,
            nodeCount: interactionGraph?.nodes?.length || 0,
            graphKeys: interactionGraph ? Object.keys(interactionGraph) : null
        });

        if (!interactionGraph || !interactionGraph.nodes || interactionGraph.nodes.length === 0) {
            console.log('🔧 PatchCompiler: No nodes to compile, returning empty result');
            return {
                behaviors: [],
                errors: [],
                metadata: {
                    compiledAt: new Date().toISOString(),
                    totalNodes: 0,
                    totalConnections: 0,
                    behaviorCount: 0
                }
            };
        }

        const compiledBehaviors = [];
        const errors = [];
        const nodeMap = new Map();

        // Build node lookup map - handle both array and object formats
        if (interactionGraph.nodes) {
            if (Array.isArray(interactionGraph.nodes)) {
                // Array format
                interactionGraph.nodes.forEach(node => {
                    nodeMap.set(node.id, node);
                });
            } else if (typeof interactionGraph.nodes === 'object') {
                // Object map format (current format)
                Object.values(interactionGraph.nodes).forEach(node => {
                    nodeMap.set(node.id, node);
                });
            }

            console.log('🔧 PatchCompiler: Built node map', {
                nodeMapSize: nodeMap.size,
                nodeFormat: Array.isArray(interactionGraph.nodes) ? 'array' : 'object',
                nodeTypes: Array.from(nodeMap.values()).map(n => ({
                    id: n.id,
                    type: n.type,
                    name: n.name || n.objectName
                }))
            });
        }

        // Find behavior chains (nodes that ultimately connect to SceneObject nodes)
        const behaviorChains = this.findBehaviorChains(interactionGraph, nodeMap);
        console.log('🔧 PatchCompiler: Found behavior chains', {
            chainCount: behaviorChains.length,
            chains: behaviorChains.map(chain => ({
                targetObject: chain.targetObject,
                behaviors: chain.behaviors.map(b => ({ type: b.type, id: b.id }))
            }))
        });

        // Compile each behavior chain
        behaviorChains.forEach((chain, index) => {
            try {
                console.log(`🔧 PatchCompiler: Compiling chain ${index + 1}/${behaviorChains.length}`, {
                    targetObject: chain.targetObject,
                    behaviorCount: chain.behaviors.length
                });

                const behavior = this.compileBehaviorChain(chain, nodeMap);
                if (behavior) {
                    compiledBehaviors.push(behavior);
                    console.log(`🔧 PatchCompiler: Successfully compiled behavior for ${behavior.objectName}`, {
                        objectUuid: behavior.objectUuid,
                        behaviorCount: behavior.behaviors.length,
                        hasUpdateFunction: !!behavior.updateFunction?.code
                    });
                } else {
                    console.warn(`🔧 PatchCompiler: No behavior generated for chain ${index + 1}`);
                }
            } catch (error) {
                console.error(`🔧 PatchCompiler: Error compiling chain ${index + 1}:`, error);
                errors.push({
                    message: `Failed to compile behavior for object ${chain.targetObject?.objectName || 'unknown'}`,
                    error: error.message,
                    chain: chain
                });
            }
        });

        const result = {
            behaviors: compiledBehaviors,
            errors: errors,
            metadata: {
                compiledAt: new Date().toISOString(),
                totalNodes: interactionGraph.nodes.length,
                totalConnections: interactionGraph.connections?.length || 0,
                behaviorCount: compiledBehaviors.length
            }
        };

        console.log('🔧 PatchCompiler: Compilation complete', {
            behaviorCount: compiledBehaviors.length,
            errorCount: errors.length,
            result: result
        });

        return result;
    }

    /**
     * Find behavior chains by tracing connections from behavior nodes to SceneObject nodes
     */
    findBehaviorChains(graph, nodeMap) {
        const chains = [];
        const processedNodes = new Set();

        // Find all target nodes (SceneObject or ObjectProperty)
        const targetNodes = [];
        if (graph.nodes) {
            // Handle nodes as array (new format)
            if (Array.isArray(graph.nodes)) {
                targetNodes.push(...graph.nodes.filter(node =>
                    node.type === 'SceneObject' || node.type === 'ObjectProperty'
                ));
            }
            // Handle nodes as object map (current format)
            else if (typeof graph.nodes === 'object') {
                Object.values(graph.nodes).forEach(node => {
                    if (node.type === 'SceneObject' || node.type === 'ObjectProperty') {
                        targetNodes.push(node);
                    }
                });
            }
        }

        console.log('🔧 PatchCompiler: Found target nodes', {
            nodeFormat: Array.isArray(graph.nodes) ? 'array' : 'object',
            totalNodes: Array.isArray(graph.nodes) ? graph.nodes.length : Object.keys(graph.nodes || {}).length,
            targetNodeCount: targetNodes.length,
            targetNodes: targetNodes.map(n => ({ id: n.id, type: n.type, objectName: n.objectName }))
        });

        targetNodes.forEach(targetNode => {
            const chain = {
                targetObject: targetNode,
                behaviors: []
            };

            // Find all connections feeding into this target node
            // Handle both connection formats: {from.nodeId, to.nodeId} and {fromNodeId, toNodeId}
            const incomingConnections = [];
            if (Array.isArray(graph.connections)) {
                graph.connections.forEach(conn => {
                    const targetNodeId = conn.to?.nodeId || conn.toNodeId;
                    if (targetNodeId === targetNode.id) {
                        incomingConnections.push(conn);
                    }
                });
            }

            console.log(`🔧 PatchCompiler: Processing target node ${targetNode.id}`, {
                targetNode: { id: targetNode.id, type: targetNode.type, objectName: targetNode.objectName },
                incomingConnectionCount: incomingConnections.length,
                connections: incomingConnections.map(c => ({
                    from: c.from?.nodeId || c.fromNodeId,
                    to: c.to?.nodeId || c.toNodeId
                }))
            });

            incomingConnections.forEach(connection => {
                const sourceNodeId = connection.from?.nodeId || connection.fromNodeId;
                const sourceNode = nodeMap.get(sourceNodeId);

                console.log(`🔧 PatchCompiler: Processing connection`, {
                    sourceNodeId,
                    sourceNodeFound: !!sourceNode,
                    sourceNodeType: sourceNode?.type,
                    isSupported: sourceNode ? this.supportedNodes.has(sourceNode.type) : false,
                    alreadyProcessed: processedNodes.has(sourceNodeId)
                });

                if (sourceNode && this.supportedNodes.has(sourceNode.type)) {

                    // Create behavior from source node
                    const behaviorChain = this.createBehaviorFromNode(
                        sourceNode,
                        targetNode,
                        connection
                    );

                    console.log(`🔧 PatchCompiler: Traced behavior chain`, {
                        sourceNodeId: sourceNode.id,
                        targetNodeId: targetNode.id,
                        behaviorChainCreated: !!behaviorChain,
                        behaviorChainType: behaviorChain?.type
                    });

                    if (behaviorChain) {
                        chain.behaviors.push(behaviorChain);
                        // Allow same source node to create multiple behaviors for different axes
                    }
                }
            });

            if (chain.behaviors.length > 0) {
                chains.push(chain);
            }
        });

        return chains;
    }

    /**
     * Create a behavior from a source node (Spin/Pulse) targeting an object
     */
    createBehaviorFromNode(sourceNode, targetNode, connection) {
        console.log(`🔧 PatchCompiler: Creating behavior from node`, {
            sourceNode: { id: sourceNode.id, type: sourceNode.type },
            targetNode: { id: targetNode.id, type: targetNode.type, objectUuid: targetNode.objectUuid, objectName: targetNode.objectName },
            connection
        });

        if (sourceNode.type === 'Spin') {
            // Determine axis based on connection target input index
            const inputIndex = connection.to?.inputIndex || connection.toInputIndex || 0;
            const axis = inputIndex === 0 ? 'x' : inputIndex === 1 ? 'y' : 'z'; // 0=x, 1=y, 2=z

            console.log(`🔧 PatchCompiler: Spin behavior axis detection`, {
                inputIndex,
                determinedAxis: axis,
                connectionInfo: {
                    toInputIndex: connection.toInputIndex,
                    toInputName: connection.to?.inputName
                }
            });

            return {
                type: 'spin',
                nodeId: sourceNode.id,
                objectUuid: targetNode.objectUuid,
                speed: sourceNode.inputs?.find(input => input.name === 'speed')?.value || 30, // Default 30 RPM
                axis: axis,
                direction: sourceNode.inputs?.find(input => input.name === 'clockwise')?.value ? 1 : -1,
                startTime: performance.now()
            };
        }

        if (sourceNode.type === 'Pulse') {
            return {
                type: 'pulse',
                nodeId: sourceNode.id,
                objectUuid: targetNode.objectUuid,
                speed: sourceNode.inputs?.find(input => input.name === 'speed')?.value || 60, // Default 60 BPM
                amount: sourceNode.inputs?.find(input => input.name === 'amount')?.value || 0.2,
                targetProperty: 'scale',
                startTime: performance.now()
            };
        }

        console.warn(`🔧 PatchCompiler: Unsupported behavior type: ${sourceNode.type}`);
        return null;
    }

    /**
     * Trace a complete behavior chain from a target connection backwards
     */
    traceBehaviorChain(targetNode, targetConnection, graph, nodeMap) {
        const chain = {
            targetNode,
            targetConnection,
            sourceNodes: []
        };

        // For simple cases (Spin/Pulse directly to ObjectRotation/ObjectScale)
        if (['Spin', 'Pulse'].includes(targetNode.type)) {
            chain.sourceNodes.push(targetNode);
            return chain;
        }

        // For complex cases, trace backwards to find source behavior nodes
        const findSourceNodes = (node) => {
            const incomingConnections = graph.connections.filter(conn =>
                conn.to.nodeId === node.id
            );

            incomingConnections.forEach(connection => {
                const sourceNode = nodeMap.get(connection.from.nodeId);
                if (sourceNode) {
                    if (['Spin', 'Pulse'].includes(sourceNode.type)) {
                        chain.sourceNodes.push(sourceNode);
                    } else if (this.supportedNodes.has(sourceNode.type)) {
                        findSourceNodes(sourceNode);
                    }
                }
            });
        };

        findSourceNodes(targetNode);

        return chain.sourceNodes.length > 0 ? chain : null;
    }

    /**
     * Compile a behavior chain into executable JavaScript
     */
    compileBehaviorChain(chain, nodeMap) {
        const objectUuid = chain.targetObject.objectUuid;
        const objectName = chain.targetObject.objectName || 'Unnamed Object';

        console.log(`🔧 PatchCompiler: Compiling behavior chain`, {
            objectUuid,
            objectName,
            behaviorCount: chain.behaviors.length,
            behaviors: chain.behaviors
        });

        if (!objectUuid) {
            throw new Error(`No object UUID found for ${objectName}`);
        }

        const behaviors = [];

        // Handle new simplified format where behaviors are directly behavior objects
        chain.behaviors.forEach(behavior => {
            if (behavior && typeof behavior === 'object' && behavior.type) {
                // This is already a compiled behavior object
                behaviors.push(behavior);
                console.log(`🔧 PatchCompiler: Added direct behavior`, behavior);
            } else {
                // This is the old format with sourceNodes - handle for compatibility
                console.warn(`🔧 PatchCompiler: Old format behavior detected`, behavior);
                const { targetNode, targetConnection, sourceNodes } = behavior;

                if (sourceNodes && Array.isArray(sourceNodes)) {
                    sourceNodes.forEach(sourceNode => {
                        const compiledBehavior = this.compileNodeBehavior(
                            sourceNode,
                            targetNode,
                            targetConnection,
                            objectUuid,
                            objectName
                        );

                        if (compiledBehavior) {
                            behaviors.push(compiledBehavior);
                        }
                    });
                }
            }
        });

        if (behaviors.length === 0) {
            console.warn(`🔧 PatchCompiler: No behaviors compiled for ${objectName}`);
            return null;
        }

        return {
            objectUuid,
            objectName,
            behaviors,
            updateFunction: this.generateUpdateFunction(behaviors, objectUuid)
        };
    }

    /**
     * Compile individual node behaviors
     */
    compileNodeBehavior(sourceNode, targetNode, connection, objectUuid, objectName) {
        switch (sourceNode.type) {
            case 'Spin':
                return this.compileSpinBehavior(sourceNode, targetNode, connection, objectUuid);
            case 'Pulse':
                return this.compilePulseBehavior(sourceNode, targetNode, connection, objectUuid);
            default:
                console.warn(`Unsupported source node type: ${sourceNode.type}`);
                return null;
        }
    }

    /**
     * Compile Spin node behavior
     */
    compileSpinBehavior(spinNode, targetNode, connection, objectUuid) {
        const speed = spinNode.inputs?.speed?.value || 60; // RPM
        const clockwise = spinNode.inputs?.clockwise?.value !== false;
        const targetProperty = connection.to.inputName; // e.g., 'rotation.y', 'rotation.x'

        // Extract axis from target property (rotation.y -> y)
        const axis = targetProperty.includes('.') ?
            targetProperty.split('.')[1] : 'y';

        const direction = clockwise ? 1 : -1;

        return {
            type: 'spin',
            nodeId: spinNode.id,
            objectUuid,
            axis,
            speed, // RPM
            direction,
            targetProperty,
            startTime: 0 // Use relative time instead of absolute timestamp
        };
    }

    /**
     * Compile Pulse node behavior
     */
    compilePulseBehavior(pulseNode, targetNode, connection, objectUuid) {
        const speed = pulseNode.inputs?.speed?.value || 20; // BPM
        const amount = pulseNode.inputs?.amount?.value || 0.2;
        const targetProperty = connection.to.inputName; // e.g., 'scale.x', 'scale'

        return {
            type: 'pulse',
            nodeId: pulseNode.id,
            objectUuid,
            speed, // BPM
            amount,
            targetProperty,
            startTime: 0 // Use relative time instead of absolute timestamp
        };
    }

    /**
     * Generate optimized update function for runtime execution
     */
    generateUpdateFunction(behaviors, objectUuid) {
        const functionBody = this.generateFunctionBody(behaviors);

        return {
            objectUuid,
            code: `
// Generated behavior function for object ${objectUuid}
function updateBehavior(object, deltaTime, elapsedTime) {
    if (!object || object.uuid !== '${objectUuid}') return;

    const currentTime = elapsedTime; // Use provided elapsed time

    ${functionBody}
}
            `.trim()
            // Removed execute function to fix IndexedDB serialization
        };
    }

    /**
     * Generate function body based on behavior types
     */
    generateFunctionBody(behaviors) {
        const codeBlocks = [];

        behaviors.forEach(behavior => {
            switch (behavior.type) {
                case 'spin':
                    codeBlocks.push(this.generateSpinCode(behavior));
                    break;
                case 'pulse':
                    codeBlocks.push(this.generatePulseCode(behavior));
                    break;
            }
        });

        return codeBlocks.join('\n\n');
    }

    /**
     * Generate spin behavior code
     */
    generateSpinCode(behavior) {
        const { axis, speed, direction } = behavior;

        return `
    // Spin behavior - ${speed} RPM, ${direction > 0 ? 'clockwise' : 'counterclockwise'}
    {
        const elapsedSeconds = currentTime / 1000; // currentTime is already elapsed time in ms
        const radiansPerSecond = (${speed} / 60) * 2 * Math.PI;
        const rotationRadians = elapsedSeconds * radiansPerSecond * ${direction};
        object.rotation.${axis} = rotationRadians;
    }`;
    }

    /**
     * Generate pulse behavior code
     */
    generatePulseCode(behavior) {
        const { speed, amount, targetProperty } = behavior;

        // Handle different target properties
        const isUniformScale = targetProperty === 'scale';
        const scaleProperty = isUniformScale ? 'x' : targetProperty.split('.')[1];

        const scaleCode = isUniformScale ?
            `object.scale.setScalar(scaleValue);` :
            `object.scale.${scaleProperty} = scaleValue;`;

        return `
    // Pulse behavior - ${speed} BPM, ${amount} amount
    {
        const elapsedSeconds = currentTime / 1000; // currentTime is already elapsed time in ms
        const cyclesPerSecond = ${speed} / 60;
        const phase = (elapsedSeconds * cyclesPerSecond) % 1;
        const pulsePhase = (Math.sin(phase * 2 * Math.PI - Math.PI / 2) + 1) / 2;
        const scaleValue = 1.0 + (pulsePhase - 0.5) * ${amount} * 2;
        ${scaleCode}
    }`;
    }

    /**
     * Get compilation statistics
     */
    getStats(compilationResult) {
        const { behaviors, errors, metadata } = compilationResult;

        const stats = {
            totalBehaviors: behaviors.length,
            totalErrors: errors.length,
            behaviorTypes: {},
            objectsWithBehaviors: new Set(),
            ...metadata
        };

        behaviors.forEach(behaviorSet => {
            stats.objectsWithBehaviors.add(behaviorSet.objectUuid);

            behaviorSet.behaviors.forEach(behavior => {
                stats.behaviorTypes[behavior.type] =
                    (stats.behaviorTypes[behavior.type] || 0) + 1;
            });
        });

        stats.objectsWithBehaviors = stats.objectsWithBehaviors.size;

        return stats;
    }

    /**
     * Validate interaction graph before compilation
     */
    validateGraph(interactionGraph) {
        const errors = [];

        if (!interactionGraph) {
            // No interaction graph is valid - just means no interactions
            return errors;
        }

        if (!interactionGraph.nodes || !Array.isArray(interactionGraph.nodes)) {
            // No nodes is also valid - just means no interactions
            return errors;
        }

        if (!interactionGraph.connections || !Array.isArray(interactionGraph.connections)) {
            errors.push('Invalid or missing connections array');
        }

        // Check for orphaned behavior nodes
        const sceneObjectNodes = interactionGraph.nodes.filter(n => n.type === 'SceneObject');
        if (sceneObjectNodes.length === 0) {
            errors.push('No SceneObject nodes found - behaviors need targets');
        }

        // Check for behavior nodes without connections
        const behaviorNodes = interactionGraph.nodes.filter(n =>
            ['Spin', 'Pulse'].includes(n.type)
        );

        behaviorNodes.forEach(node => {
            const hasOutgoingConnections = interactionGraph.connections.some(conn =>
                conn.from.nodeId === node.id
            );

            if (!hasOutgoingConnections) {
                errors.push(`Behavior node ${node.type} (${node.id}) has no outgoing connections`);
            }
        });

        return errors;
    }
}