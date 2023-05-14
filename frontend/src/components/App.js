import { useState, useEffect, useCallback } from "react";
import '../css/App.scss'
import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore"
import { onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { useNavigate } from 'react-router-dom';

import { getDateAsString } from "../utils";

function App() {
  const navigate = useNavigate();
  const [ occupation, setOccupation ] = useState(0)
  const [ time, setTime ] = useState(0)
  const [ firestore, setFirestore ] = useState(null)
  const [ storage, setStorage ] = useState(null)
  const [ previewUrl, setPreviewUrl ] = useState('')
  
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
    const app = initializeApp(firebaseConfig, {
      experimentalForceLongPolling: true, // this line
      useFetchStreams: false, // and this line
    });
    const tmpFirestore = getFirestore(app)
    const tmpStorage = getStorage();

    setFirestore(tmpFirestore)
    setStorage(tmpStorage)
  }

  const getPreviewUrl = useCallback(async (datetime) => {
    const url = await getDownloadURL(ref(storage, `previews/${datetime}.png`))

    setPreviewUrl(url)
  }, [storage])

  const listenForCollectionData = useCallback(async () => {
    const countsRef = collection(firestore, "num_carros")
    const mostRecentQuery = query(countsRef, orderBy('timestamp', 'desc'), limit(1))

    const unsubscribe = onSnapshot(mostRecentQuery, querySnapshot => {
      querySnapshot.forEach(doc => {
        const countData = doc.data()
        setOccupation(countData.num_carros)
        setTime(countData.timestamp)
        getPreviewUrl(countData.timestamp)
      })
    })

    return unsubscribe
  }, [firestore, getPreviewUrl])

  useEffect(initFirestore, [initFirestore])
  useEffect(() => {
    if(firestore)
      listenForCollectionData()
  }, [firestore, listenForCollectionData])
  
  const navigateToCurrentPage = () => {
    navigate('/forecast')
  }

  return (
    <div className="App">
      <header>
        <label className="title-label">SA - Atualidade</label>
        <button className="nav-btn" onClick={navigateToCurrentPage} >Ocupação atual</button>
      </header>

      <div className="occupation-display-container">
        <label className="main-label">Ocupação atual:</label>
        <label className="main-label occupation-label">{ occupation }/12</label>
        <label className="main-label time-label">{ getDateAsString(new Date(Date.parse(time))) }</label>
      </div>

      <div className="img-preview-container">
        <img src={previewUrl} alt="preview img"/>
      </div>

    </div>
  );
}

export default App;
