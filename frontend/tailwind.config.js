export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  safelist: [
    'cursor-nw-resize',
    'cursor-ne-resize',
    'cursor-sw-resize',
    'cursor-se-resize',
    'cursor-n-resize',
    'cursor-s-resize',
    'cursor-w-resize',
    'cursor-e-resize',
  ],
  corePlugins: { preflight: false },
  important: '#ai-skin-assessment',
  theme: { extend: {} },
  plugins: [],
}