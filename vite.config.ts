import { defineConfig } from 'vite';

export default defineConfig({
	optimizeDeps: {
		exclude: [
			"xmllint-wasm"
		]
	},
	base: "./"
});