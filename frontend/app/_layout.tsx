import { Stack } from 'expo-router';
import React from 'react';
import { LanguageProvider } from './lib/i18n';

export default function RootLayout() {
	return (
		<LanguageProvider>
			<Stack screenOptions={{ headerShown: false }} />
		</LanguageProvider>
	);
}
