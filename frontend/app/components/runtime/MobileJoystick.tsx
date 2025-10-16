'use client';

import React, { useEffect, useState, useRef } from 'react';
import nipplejs from 'nipplejs';
import { throttle } from 'lodash';

const MobileJoystick = () => {
    const [joystickManager, setJoystickManager] = useState<any>(null);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (containerRef.current && isMobile) {
            const manager = nipplejs.create({
                zone: containerRef.current,
                mode: 'static',
                position: { left: '48px', bottom: '24px' },
                size: 100,
                color: 'gray',
            });
            setJoystickManager(manager);
        }

        return () => {
            if (joystickManager) {
                joystickManager.destroy();
            }
        };
    }, [isMobile]);

    useEffect(() => {
        if (joystickManager) {
            const onStart = () => {
                console.log('🕹️ Joystick start');
            };

            const onEnd = () => {
                setTimeout(() => {
                    localStorage.setItem('joystickData', 'null');
                    console.log('🕹️ Joystick end');
                }, 20);
            };

            const onMove = throttle((evt: any, data: any) => {
                const angle = data.angle.radian;
                const maxForce = 2;
                const force = Math.min(data.force, maxForce);
                localStorage.setItem('joystickData', JSON.stringify({ angle, force }));
            }, 20);

            joystickManager.on('start', onStart);
            joystickManager.on('end', onEnd);
            joystickManager.on('move', onMove);

            return () => {
                joystickManager.off('start', onStart);
                joystickManager.off('end', onEnd);
                joystickManager.off('move', onMove);
            };
        }
    }, [joystickManager]);

    if (!isMobile) return null;

    return (
        <div
            ref={containerRef}
            className="fixed"
            style={{
                left: '20px',
                bottom: '80px',
                width: '150px',
                height: '150px',
                zIndex: 1000
            }}
        />
    );
};

export default MobileJoystick;
