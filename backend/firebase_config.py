import firebase_admin
from firebase_admin import credentials, firestore, storage

cred = credentials.Certificate("firebase-key.json")

firebase_admin.initialize_app(
    cred,
    {
        "storageBucket": "the-bharat-e-paper.firebasestorage.app"
    }
)

db = firestore.client()
bucket = storage.bucket()