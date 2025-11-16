// Load environment variables from .env file if it exists
try {
  require('dotenv').config({ path: '.env' });
} catch (error) {
  // dotenv not installed or .env doesn't exist
  // Environment variables can be set directly in the shell
}

module.exports = {
  expo: {
    name: "in-vento",
    slug: "in-vento",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "invento",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    // 🔹 Extra config (public and sensitive variables)
    extra: {
      // Public variables (prefixed EXPO_PUBLIC_) – safe to show in app bundle
      weatherCity: process.env.EXPO_PUBLIC_WEATHER_CITY || "Dasmarinas",

      // Sensitive variables – keep secret, not visible in the app bundle
      weatherApiKey: process.env.WEATHER_API_KEY || "",

      // EAS Project ID (required)
      eas: {
        projectId: "2eebaf7b-ff06-4d7c-a1b6-6f26e877d869",
      },
    },

    ios: {
      supportsTablet: true,
    },

    android: {
      package: "com.aaronlazaro.invento", // REQUIRED for EAS build
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: { backgroundColor: "#000000" },
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
