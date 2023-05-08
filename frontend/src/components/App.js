import { useState, useEffect } from "react";
import '../css/App.scss'
import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore"
import { onSnapshot, doc, getDocs, collection, query, orderBy, limit } from "firebase/firestore";

function App() {
  const [ occupation, setOccupation ] = useState(0)
  const [ time, setTime ] = useState(0)
  const [ firestore, setFirestore ] = useState(null)
  
  const firebaseConfig = {
    apiKey: process.env.REACT_APP_apiKey,
    authDomain: process.env.REACT_APP_authDomain,
    projectId: process.env.REACT_APP_projectId,
    storageBucket: process.env.REACT_APP_storageBucket,
    messagingSenderId: process.env.REACT_APP_messagingSenderId,
    appId: process.env.REACT_APP_appId,
    measurementId: process.env.REACT_APP_measurementId
  };
  
  const initFirestore = () => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app)
    setFirestore(firestore)
  }

  const listenForCollectionData = async () => {
    const countsRef = collection(firestore, "num_carros")
    const mostRecentQuery = query(countsRef, orderBy('timestamp', 'desc'), limit(1))

    const unsubscribe = onSnapshot(mostRecentQuery, querySnapshot => {
      querySnapshot.forEach(doc => {
        setOccupation(doc.data().num_carros)
        setTime(doc.data().timestamp)
      })
    })

    return unsubscribe
  }

  useEffect(initFirestore, [])
  useEffect(() => {
    if(firestore) {
      const unsubscribe = listenForCollectionData()
      
      return () => { if(unsubscribe) unsubscribe() }
    }
  }, [firestore])

  return (
    <div className="App">
      <header>SA</header>

      <div className="occupation-display-container">
        <label className="main-label">Ocupação atual:</label>
        <label className="main-label occupation-label">{ occupation }/12</label>
        <label className="main-label time-label">{ time }/12</label>
      </div>

      <div className="img-preview-container">
        <img src={process.env.REACT_APP_PREVIEW_IMG_URL} alt="new"/>
      </div>

    </div>
  );
}

export default App;
