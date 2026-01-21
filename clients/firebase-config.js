<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyBawF_wynu2aM60hrknuESv-hA2g_8W18A",
    authDomain: "epcclients-61ee6.firebaseapp.com",
    projectId: "epcclients-61ee6",
    storageBucket: "epcclients-61ee6.firebasestorage.app",
    messagingSenderId: "290706438619",
    appId: "1:290706438619:web:d8beb28d6a8282fd574ffe",
    measurementId: "G-9FW3SMZ944"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>