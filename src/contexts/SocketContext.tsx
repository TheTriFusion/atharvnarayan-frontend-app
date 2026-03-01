import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setConnected(false);
            }
            return;
        }

        // Connect socket if authenticated
        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            autoConnect: true,
            query: { userId: user.id } // Pass userId for easier identification
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected as:', user.name || user.id);
            setConnected(true);

            // Auto-join relevant rooms based on role
            if (user.role === 'milkTruckOwner' || user.role === 'cattleFeedTruckOwner' || user.role === 'superadmin') {
                socket.emit('join_owner_room', { ownerId: user.id });
            }
        });

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
            setConnected(false);
        });

        socket.on('connect_error', (err) => {
            console.warn('[Socket] Connection error:', err.message);
            setConnected(false);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
    }, [isAuthenticated, user?.id]);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
