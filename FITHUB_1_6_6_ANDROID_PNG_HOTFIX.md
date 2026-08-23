# FitHub 1.6.6 Android PNG Hotfix

GitHub Actions identified a truncated PNG while AAPT2 compiled the release APK. A full binary validation found and rebuilt all 16 affected images, not only the first filename reported by the build.

## Apply the hotfix

1. Extract `FitHub_1.6.6_ANDROID_PNG_HOTFIX.zip`.
2. Open the FitHub repository on GitHub.
3. Upload each file from `assets/train_v3/male` into the repository's matching `assets/train_v3/male` folder.
4. Upload each file from `assets/train_v3/female` into `assets/train_v3/female`.
5. When GitHub warns that the filenames already exist, continue so the files are replaced.
6. Commit with `Fix Android exercise PNG encoding`.
7. Open **Actions**, run **Build FitHub APK** again, and use the newest run.

Do not delete either complete gender folder. Only replace the files supplied in the hotfix.
