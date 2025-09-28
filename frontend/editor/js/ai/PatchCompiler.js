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
            'SceneObject'
        ]);
    }

    /**
     * Compile interaction graph to JavaScript behaviors
     * @param {Object} interactionGraph - Serialized interaction graph from editor
     * @returns {Object} Compiled behaviors with execution code
     */
    compile(interactionGraph) {
        if (!interactionGraph || !interactionGraph.nodes || interactionGraph.nodes.length === 0) {
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

        // Build node lookup map
        if (Array.isArray(interactionGraph.nodes)) {
            interactionGraph.nodes.forEach(node => {
                nodeMap.set(node.id, node);
            });
        }

        // Find behavior chains (nodes that ultimately connect to SceneObject nodes)
        const behaviorChains = this.findBehaviorChains(interactionGraph, nodeMap);

        // Compile each behavior chain
        behaviorChains.forEach(chain => {
            try {
                const behavior = this.compileBehaviorChain(chain, nodeMap);
                if (behavior) {
                    compiledBehaviors.push(behavior);
                }
            } catch (error) {
                errors.push({
                    message: `Failed to compile behavior for object ${chain.targetObject?.objectName || 'unknown'}`,
                    error: error.message,
                    chain: chain
                });
            }
        });

        return {
            behaviors: compiledBehaviors,
            errors: errors,
            metadata: {
                compiledAt: new Date().toISOString(),
                totalNodes: interactionGraph.nodes.length,
                totalConnections: interactionGraph.connections.length,
                behaviorCount: compiledBehaviors.length
            }
        };
    }

    /**
     * Find behavior chains by tracing connections from behavior nodes to SceneObject nodes
     */
    findBehaviorChains(graph, nodeMap) {
        const chains = [];
        const processedNodes = new Set();

        // Find all SceneObject nodes as targets
        const sceneObjectNodes = Array.isArray(graph.nodes) ?
            graph.nodes.filter(node => node.type === 'SceneObject') : [];

        sceneObjectNodes.forEach(sceneObjectNode => {
            const chain = {
                targetObject: sceneObjectNode,
                behaviors: []
            };

            // Find all connections feeding into this SceneObject
            const incomingConnections = Array.isArray(graph.connections) ?
                graph.connections.filter(conn => conn.to.nodeId === sceneObjectNode.id) : [];

            incomingConnections.forEach(connection => {
                const sourceNode = nodeMap.get(connection.from.nodeId);
                if (sourceNode && this.supportedNodes.has(sourceNode.type) &&
                    !processedNodes.has(sourceNode.id)) {

                    // Trace back to find complete behavior chain
                    const behaviorChain = this.traceBehaviorChain(
                        sourceNode,
                        connection,
                        graph,
                        nodeMap
                    );

                    if (behaviorChain) {
                        chain.behaviors.push(behaviorChain);
                        processedNodes.add(sourceNode.id);
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

        if (!objectUuid) {
            throw new Error(`No object UUID found for ${objectName}`);
        }

        const behaviors = [];

        chain.behaviors.forEach(behaviorChain => {
            const { targetNode, targetConnection, sourceNodes } = behaviorChain;

            sourceNodes.forEach(sourceNode => {
                const behavior = this.compileNodeBehavior(
                    sourceNode,
                    targetNode,
                    targetConnection,
                    objectUuid,
                    objectName
                );

                if (behavior) {
                    behaviors.push(behavior);
                }
            });
        });

        if (behaviors.length === 0) {
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
            startTime: Date.now()
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
            startTime: Date.now()
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
function updateBehavior(object, deltaTime) {
    if (!object || object.uuid !== '${objectUuid}') return;

    const currentTime = performance.now();

    ${functionBody}
}
            `.trim(),
            // Also provide a callable function for immediate use
            execute: new Function('object', 'deltaTime', `
                if (!object || object.uuid !== '${objectUuid}') return;
                const currentTime = performance.now();
                ${functionBody}
            `)
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
        const { axis, speed, direction, startTime } = behavior;

        return `
    // Spin behavior - ${speed} RPM, ${direction > 0 ? 'clockwise' : 'counterclockwise'}
    {
        const elapsedSeconds = (currentTime - ${startTime}) / 1000;
        const radiansPerSecond = (${speed} / 60) * 2 * Math.PI;
        const rotationRadians = elapsedSeconds * radiansPerSecond * ${direction};
        object.rotation.${axis} = rotationRadians;
    }`;
    }

    /**
     * Generate pulse behavior code
     */
    generatePulseCode(behavior) {
        const { speed, amount, startTime, targetProperty } = behavior;

        // Handle different target properties
        const isUniformScale = targetProperty === 'scale';
        const scaleProperty = isUniformScale ? 'x' : targetProperty.split('.')[1];

        const scaleCode = isUniformScale ?
            `object.scale.setScalar(scaleValue);` :
            `object.scale.${scaleProperty} = scaleValue;`;

        return `
    // Pulse behavior - ${speed} BPM, ${amount} amount
    {
        const elapsedSeconds = (currentTime - ${startTime}) / 1000;
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