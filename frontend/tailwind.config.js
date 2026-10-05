// export default {
//   content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
//   theme: { extend: {} },
//   plugins: [],
// }


// ye shopify mein intigration ke liye hai
// export default {
//   content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
//   // 👇 Ye block add kiya hai taaki global CSS leak na ho
//   corePlugins: {
//     preflight: false,
//   },
//   theme: { extend: {} },
//   plugins: [],
// }



// new

// export default {
//   content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
//   corePlugins: { preflight: false },
//   important: '#root', // 👈 Ye line ensure karegi ki Tailwind CSS Shopify ke header/footer mein leak na ho
//   theme: { extend: {} },
//   plugins: [],
// }

// new new

export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  corePlugins: { preflight: false },
  important: '#ai-skin-assessment', // 👈 Yahan '#root' ki jagah ye naya ID likho
  theme: { extend: {} },
  plugins: [],
}