// export default {
//   content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
//   theme: { extend: {} },
//   plugins: [],
// }


// ye shopify mein intigration ke liye hai
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  // 👇 Ye block add kiya hai taaki global CSS leak na ho
  corePlugins: {
    preflight: false,
  },
  theme: { extend: {} },
  plugins: [],
}