import cv2
import numpy as np
from PIL import Image
from datetime import datetime

from datetime import datetime
from ultralytics import YOLO
from ultralytics.yolo.utils import ops
import requests

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore, storage

cred = credentials.Certificate("./key.json")

#firebase_admin.initialize_app(cred)

app = firebase_admin.initialize_app(cred, {'storageBucket': 'teste-f902a.appspot.com'})

db = firestore.client()

MAX_AVAILABLE_PARKING_SLOTS = 14

def get_weather():
    apiKey = 'f0365f1b76064139b07153811210612';
    forecastApiUrl = f'http://api.weatherapi.com/v1/forecast.json?key={apiKey}&q=41.554536,-8.405331'
    res = requests.get(forecastApiUrl).json()

    temperature = res['current']['temp_c']
    weather_condition = res['current']['condition']['text']

    return temperature, weather_condition

def save_to_storage(datetime, prefix='previews'):
    fileName = "preview.jpg"
    bucket = storage.bucket()

    if prefix == 'previews':
        blobs = bucket.list_blobs(prefix=prefix)
        print(blobs)
        for blob in blobs:
            print(blob)
            blob.delete()

    blob = bucket.blob(f'{prefix}/{datetime}.png')
    blob.upload_from_filename(fileName)

def send_to_firebase(db, json_object):
    datetime = str(json_object['timestamp'])

    save_to_storage(datetime)

    temperature, weather_condition = get_weather()
    json_object['temperature'] = temperature
    json_object['weather_condition'] = weather_condition

    if json_object['num_carros'] > MAX_AVAILABLE_PARKING_SLOTS:
        print("Saving mislabeled")
        save_to_storage(datetime, prefix='mislabeled')

    db.collection(u'num_carros').document(datetime).set(json_object)


def get_detections(img_path, model):
    # Model
    # model = torch.hub.load('ultralytics/yolov5', 'yolov5s')

    # Images
    #dir = 'teste_orig.jpg'
    #imgs = [dir + f for f in ('zidane.jpg', 'bus.jpg')]  # batch of images

    # Inference
    results = model(img_path)
    # results = ops.non_max_suppression(results)
    img = results[0].plot(conf=False, labels=False)
    filtered_detections = list(filter(lambda x: x in [ 2, 7 ], list(results[0].boxes.cls)))
    # print(len(filtered_detections))

    cv2.imwrite('preview.jpg', img)

    # # Results
    # print("Results: ", results[0].keypoints)
    # # results.print()  # or .show(), .save(), .crop(), .pandas(), etc.

    # results.save(labels=False)

    # #results.xyxy[0]  # im predictions (tensor)
    # classes = list(filter(lambda x : x in ['car', 'truck'], results.pandas().xyxy[0]['name'].values))
    # print(len(classes))  # número de objetos detetados que sejam carros ou camiões, objetos que podem ocupar os lugares em questão

    json_object = {
        "num_carros": len(filtered_detections),
        'timestamp': f"{datetime.now()}"
    }
    # send_to_firebase(db, json_object)

def apply_preprocessing(img):
    mask = np.ones(img.shape[:2], dtype="uint8")
    cv2.fillPoly(mask, pts=[np.array([[0, 405], [640, 245], [640, 260], [0, 430]])], color=(0, 0, 0))
    cv2.fillPoly(mask, pts=[np.array([[570, 200], [640, 200], [640, 225], [570, 235]])], color=(0, 0, 0))
    cv2.imshow("Rectangular Mask", mask)
    im = cv2.bitwise_and(img, img, mask=mask)

    return im


def capture_video(model):
    cap = cv2.VideoCapture(0)

    fps = int(cap.get(cv2.CAP_PROP_FPS))
    save_interval = 5 # tirar foto de X em X segundos

    frame_count = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if ret:
            frame_count += 1
        else:
            break

        if frame_count % (fps*save_interval) == 0:
            get_detections(frame, model)
        
        cv2.imshow('frame', frame)
        
        if cv2.waitKey(1) == 1:
            break

    cap.release()
    cv2.destroyAllWindows()

def main():
    model = YOLO("yolov8x.onnx")

    # capture_video(model)
    img = cv2.imread('out.jpg')
    preprocessed_img = apply_preprocessing(img)
    get_detections(preprocessed_img, model)

    # capture_video(model)

if __name__ == "__main__":
    main()