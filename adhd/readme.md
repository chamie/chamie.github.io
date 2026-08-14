# Zero-Friction Interruption Buffer

A zero-friction interruption buffer/log for managing ADHD.

It's intended to be installed as a PWA. When you get distracted from your current task, you just open it, write down whatever you can about the distracting idea, and get back to your task.

You don't have to worry about forgetting it, and you don't have to enter anything your PC or phone could already tell you about that moment—your geolocation, time, day, etc.

Or you can simply attach a file, a picture, a new camera shot, a voice note, etc.

And don't worry: nothing goes anywhere. Everything is stored in the browser storage on your device, and your device only: text and metadata in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), and attachments in [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system).

You can export it to a file, too.

No registration required. No app stores. No trust. No friction.

Permissions are only requested when needed, but you can also request and save them all with one button so they won't cause friction when you use the app.

## Roadmap

1. Add ZIP-file export, so attachments are included too.
2. Add sync: connect two or more devices using WebRTC. You simply share a "room" key (enter it manually or scan a QR code), and the devices sync whenever they're both online.
