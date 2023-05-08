import cv2
import time
import numpy as np
import torch

from datetime import datetime

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

cred = credentials.Certificate("./key.json")

#firebase_admin.initialize_app(cred)

app = firebase_admin.initialize_app(cred)

db = firestore.client()


def send_to_firebase(db, datetime, json_object):
    db.collection(u'num_carros').document(str(datetime)).set(json_object)


def use_model(img_path):
    # Model
    model = torch.hub.load('ultralytics/yolov5', 'yolov5s')

    # Images
    #dir = 'teste_orig.jpg'
    #imgs = [dir + f for f in ('zidane.jpg', 'bus.jpg')]  # batch of images

    # Inference
    results = model(img_path)

    # Results
    print("Results: ")
    results.print()  # or .show(), .save(), .crop(), .pandas(), etc.

    results.save(labels=False)

    #results.xyxy[0]  # im predictions (tensor)
    classes = list(filter(lambda x : x in ['car', 'truck'], results.pandas().xyxy[0]['name'].values))
    print(len(classes))  # número de objetos detetados que sejam carros ou camiões, objetos que podem ocupar os lugares em questão

    json_object = {
        "num_carros": len(classes)
    }
    send_to_firebase(db, datetime.now(), json_object)



def capture_video():
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
            use_model(frame)
        
        cv2.imshow('frame', frame)
        
        if cv2.waitKey(1) == 1:
            break

    cap.release()
    cv2.destroyAllWindows()



def main():
    capture_video()


if __name__ == "__main__":
    main()