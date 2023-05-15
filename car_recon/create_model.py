# import tensorflow_decision_forests as tfdf
import tensorflow as tf
import pandas as pd
from tensorflow import keras
import tensorflowjs as tfjs
import numpy as np

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage
from datetime import datetime

from sklearn import preprocessing

def extract_datetime_features(datetime_str):
    datetime_object = datetime.strptime(datetime_str, '%Y-%m-%d %H:%M:%S.%f')

    data = {
        'weekday': datetime_object.weekday(),
        'hour': datetime_object.hour,
        'minute': datetime_object.minute
    }

    return data

def data_gathering_pipeline():
    cred = credentials.Certificate("./key.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    docs = db.collection(u'num_carros').stream()
    data = []
    i = 0
    for doc in docs:
        entry = doc.to_dict()
        doc_data = extract_datetime_features(entry['timestamp'])
        doc_data['n_carros'] = entry['num_carros']
        doc_data['temperature'] = 12 # entry['temperature']
        doc_data['weather_condition'] = 'Sunny' if i % 2 == 0 else 'Rainy' # entry['weather_condition']

        i += 1

        data.append(doc_data)

    return data

def train_model(dataset):
    dataset.loc[(dataset['weather_condition'] == "Sunny"), 'weather_condition'] = 1
    dataset.loc[(dataset['weather_condition'] == "Rainy"), 'weather_condition'] = 0
    dataset['weather_condition'] = pd.to_numeric(dataset["weather_condition"])

    print(dataset)

    X, y = dataset.drop('n_carros', axis=1), dataset.n_carros

    # tf_dataset = tfdf.keras.pd_dataframe_to_tf_dataset(dataset, label="n_carros")

    model = keras.Sequential([
        keras.layers.Dense(128, activation='relu', input_shape=[len(X.keys())]),
        keras.layers.Dense(64, activation='relu'),
        keras.layers.Dense(1, activation='relu')
    ])

    model.compile(optimizer=tf.keras.optimizers.RMSprop(0.001),
              loss='mse',
              metrics=['mae', 'mse'])
    
    model.fit(X, y, epochs=15)

    print(model.summary())

    return model

def save_to_tfjs(model, model_dir):
    tfjs.converters.save_keras_model(model, model_dir)


def save_to_tflite(model_dir):
    converter = tf.lite.TFLiteConverter.from_saved_model(model_dir) # path to the SavedModel directory
    tflite_model = converter.convert()

    with open('models/model.tflite', 'wb') as f:
        f.write(tflite_model)

def main():
    data = data_gathering_pipeline()
    df = pd.DataFrame(data)
    model = train_model(df)
    model_dir = "models/modelv2"
    print(model.predict([[3, 13, 30, 12, 1]]))
    model.save(model_dir)

    save_to_tfjs(model, model_dir)
    # save_to_tflite(model_dir)


main()