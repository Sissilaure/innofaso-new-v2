import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCVUO74PqixaxIWdOY6ItHUI3wPqhS0uP0",
  authDomain: "innofaso-iot.firebaseapp.com",
  databaseURL: "https://innofaso-iot-default-rtdb.firebaseio.com",
  projectId: "innofaso-iot",
  storageBucket: "innofaso-iot.appspot.com",
  messagingSenderId: "995065305458",
  appId: "1:995065305458:web:cfb009b1ec42c73515e5eb",
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);