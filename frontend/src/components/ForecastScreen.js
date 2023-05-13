import { useState, useEffect } from "react";
import '../css/App.scss'
import DateTimePicker from 'react-datetime-picker';
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';

import * as tf from '@tensorflow/tfjs';
import { getDateAsString } from "../utils";

function ForecastScreen() {
  const [ model, setModel ] = useState(null)
  const [ occupation, setOccupation ] = useState(null)
  const [ datetime, onDateTimeChange ] = useState(new Date());

  const url = {
    // model: 'https://firebasestorage.googleapis.com/v0/b/teste-f902a.appspot.com/o/model.json?alt=media&token=1af2132a-035e-4b2e-b323-355310571ef3' 
    model: 'http://localhost:3000/modelv2/model.json',
  };

  async function loadModel(url) {
    try {// For layered model
      console.log("Loading model...")
      const model = await tf.loadLayersModel(url.model);// For graph model
      // const model = await tf.loadGraphModel(url.model);setModel(model);
      console.log("Load model success")

      setModel(model)
    }catch (err) {
      console.log(err);
    }
  }//React Hook

  useEffect(()=>{
    tf.ready().then(async ()=>{
      loadModel(url)
    });
  },[])
  
  const useModel = async () => {
    if(model != null) {
      const weather = await getWeather()

      const dayOfWeek = datetime.getUTCDay()
      const hours = datetime.getHours()
      const minutes = datetime.getMinutes()
      const input = [[dayOfWeek, hours, minutes, weather.temperature, weather.condition]]
      console.log(input)
      let start = Date.now();
  
      // Run inference and get output tensors.
      let outputTensor = model.predict(tf.tensor(input)) // as tf.Tensor
      let timeTaken = Date.now() - start;
      console.log("Total time taken : " + timeTaken + " milliseconds");
      const result = Math.round(outputTensor.dataSync())
      console.log(outputTensor.dataSync(), result)
      setOccupation(result)
    }
  }
  
  const weatherUrl = 'https://forecast9.p.rapidapi.com/rapidapi/forecast/-8.40533/41.55453/hourly/';
  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': '3581b59cb7msh33361ea118dbcbdp1be141jsna226828c7959',
      'X-RapidAPI-Host': 'forecast9.p.rapidapi.com'
    }
  };

  const getRoundedNumber = (number) => {
    let hours = String(number - (number%3)).padStart(2, '0')
    return hours
  }

  const getWeather = async () => {
    const response = await fetch(weatherUrl, options).then(res => res.json())
    const items = response.items
    const roundedDateTimeStr = `${datetime.getUTCFullYear()}-${String(datetime.getUTCMonth()+1).padStart(2, '0')}-${String(datetime.getUTCDate()).padStart(2, '0')}T${getRoundedNumber(datetime.getHours())}:00:00Z`
    const weather = items.filter(i => {
      console.log(i.date == roundedDateTimeStr)
      return i.date == roundedDateTimeStr
    })
    console.log(roundedDateTimeStr)
    console.log(weather)
    
    return {
      temperature: weather[0].temperature.avg,
      condition: weather[0].weather.text != 'Regen'
    }
  }

  return (
    <div className="App">
      <header>SA - Forecast</header>

      <div className="occupation-display-container">
        <label className="main-label">Ocupação prevista:</label>
        <label className="main-label occupation-label">{(!occupation) ? '-' : occupation}/12</label>
        <label className="main-label time-label">{getDateAsString(new Date())}</label>

        <div className="datepicker-container">
          <DateTimePicker
            amPmAriaLabel={'Select AM/PM'}
            onChange={onDateTimeChange}
            value={datetime}
            format={"dd-MM-yy h:mm"}
            />
        </div>

        <button className="predict-btn" onClick={useModel}>Prever</button>
      </div>

    </div>
  );
}

export default ForecastScreen;
