import { useState, useEffect, useMemo, useCallback } from "react";
import '../css/App.scss'
import 'react-datetime-picker/dist/DateTimePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';
import { useNavigate } from 'react-router-dom';


import * as tf from '@tensorflow/tfjs';
import { getDateAsString } from "../utils";

function ForecastScreen() {
  const navigate = useNavigate();
  const [ model, setModel ] = useState(null)
  const [ occupation, setOccupation ] = useState(null)
  const [ predictedDatetime, setPredictedDatetime ] = useState(null);
  const [ date, setDate ] = useState('')
  const [ time, setTime ] = useState('')
  const [ errorMsg, setErrorMsg ] = useState(null)
  const [ isSelectedDateTimeValid, setIsSelectedDateTimeValid ] = useState()

  const url = useMemo(() => {return {
    // model: 'https://firebasestorage.googleapis.com/v0/b/teste-f902a.appspot.com/o/model.json?alt=media&token=1af2132a-035e-4b2e-b323-355310571ef3' 
    model: process.env.REACT_APP_PUBLISH_HOST + '/model/model.json',
  }}, [])

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

  const parseDateTime = useCallback(() => {
    const timeObj = {
      hours: time.split(':')[0],
      minutes: time.split(':')[1],
    }
    const datetime = new Date(Date.parse(date))
    datetime.setHours(timeObj.hours)
    datetime.setMinutes(timeObj.minutes)

    return datetime
  }, [date, time])

  const createModelInput = (datetime, weather) => {
    const dayOfWeek = datetime.getUTCDay()
    const hours = datetime.getHours()
    const minutes = datetime.getMinutes()
    const input = [[dayOfWeek, hours, minutes, weather.temperature]]
    // const input = [[dayOfWeek, hours, minutes, weather.temperature, weather.condition]]

    console.log(input)
    
    return input
  }
  
  const useModel = async () => {
    console.log(date, time)
    if(model !== null) {
      const datetime = parseDateTime()
      const weather = await getWeather(datetime)

      if(weather === null) return

      let start = Date.now();
      const input = createModelInput(datetime, weather)
      let outputTensor = model.predict(tf.tensor(input)) // as tf.Tensor
      let timeTaken = Date.now() - start;

      console.log("Total time taken : " + timeTaken + " milliseconds");
      const result = Math.round(outputTensor.dataSync())
      console.log(outputTensor.dataSync(), result)

      setPredictedDatetime(datetime)
      setOccupation(result > 14 ? 14 : result)
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

  const getWeather = async (datetime) => {
    const response = await fetch(weatherUrl, options).then(res => res.json())
    const items = response.items
    const roundedDateTimeStr = `${datetime.getUTCFullYear()}-${String(datetime.getUTCMonth()+1).padStart(2, '0')}-${String(datetime.getUTCDate()).padStart(2, '0')}T${getRoundedNumber(datetime.getHours())}:00:00Z`
    const weather = items.filter(i => i.date === roundedDateTimeStr)
    
    if(weather.length === 0) {
      setErrorMsg("Data inválida (Máximo 10 dias)")
      return null
    }
    console.log(weather[0].weather.text)
    return {
      temperature: weather[0].temperature.avg,
      condition: !weather[0].weather.text.includes('Regen') ? 1 : 0
    }
  }

  const onDateChange = e => {
    setDate(e.target.value)
    setErrorMsg(null)
  }

  const onTimeChange = e => {
    setTime(e.target.value)
    setErrorMsg(null)
  }
  
  const navigateToCurrentPage = () => {
    navigate('/')
  }

  const checkIsSelectedDateTimeValid = useCallback(() => {
    const isDateStrValid = date !== ''
    const isTimeStrValid = time !== ''

    if(!(isDateStrValid && isTimeStrValid)) return false

    const datetime = parseDateTime()
    const currDate = new Date()

    const timeDiff = new Date(datetime - currDate)

    return datetime > currDate && timeDiff.getUTCDate() <= 10
  }, [date, parseDateTime, time])

  // useEffect(() => {getModelFile()}, [])

  useEffect(()=>{
    tf.ready().then(async () => {
      loadModel(url)
    });
  },[url])

  useEffect(() => {
    const d = checkIsSelectedDateTimeValid()
    console.log(d)
    setIsSelectedDateTimeValid(d)
  }, [date, time, checkIsSelectedDateTimeValid])


  return (
    <div className="App">
      <header>
        <label className="title-label">Previsão de lotação</label>
        <button className="nav-btn" onClick={navigateToCurrentPage} >Ocupação atual</button>
      </header>

      <main className="forecast-main">
        <div className="occupation-display-container">
          <label className="main-label">Ocupação prevista:</label>
          <label className="main-label occupation-label">{(!occupation) ? '-' : occupation}<label>/14</label></label>
          {
            occupation && 
              <label className="main-label time-label">{getDateAsString(predictedDatetime)}</label>
          }


          <div className="datetime-picker-container">
            <label className="main-label datepicker-label">Data e hora (máximo de 10 dias):</label>
            <label className="main-label">
              <input type="date" className="datetime-picker" onChange={onDateChange} value={date} />
            </label>
            <label className="main-label">
              <input type="time" className="datetime-picker" onChange={onTimeChange} value={time} />
            </label>
          </div>

          {
            errorMsg && 
            <label className="main-label error-label"> { errorMsg } </label>
          }

          <button className="predict-btn" disabled={!isSelectedDateTimeValid} onClick={useModel}>Prever</button>
        </div>
      </main>
    </div>
  );
}

export default ForecastScreen;
