// app/_layout.tsx
import React from 'react';
import { Slot } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Slot renders the current route, starting with app/index.tsx */}
      <Slot />
    </AuthProvider>
  );
}