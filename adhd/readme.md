Zero-friction interruptions buffer/log for managing ADHD.
Intended for installation as a PWA app.
You just open it when distracted from your current task, write down what you can about that distracting idea and get back to your task.
You don't have to worry it's gone now, and you don't have to enter anything your PC/phone could tell about that moment - you geolocation, time, day, etc.
Or you can just attach a file, a picture, a new camera shot, a voice note..
And don't worry, it doesn't go anywhere, it's all stored in the browser storage on your device and your device only: in text and metadata in [indexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), attachments in [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
And you can export it to a file too.
No registration required, no app stores, no trust, no friction.
All the permissions are only requested when needed, but you can also just request and save them all with one button, so they won't cause friction when you use the app.

Roadmap:
1. Add Zip-file export, so that the attachments get in there too.
2. Add sync: connect 2 or more devices using WebRTC: you just share a "room" key (enter manually or scan a QR code) and they will sync each time they're both online.
