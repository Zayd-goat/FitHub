# FitHub 1.6.5 Android image hotfix

The original generated `jump_rope.png` and `leg_press.png` files were truncated during image processing. Metro could list them, but Android AAPT2 rejected `jump_rope.png` while compiling the release APK. Both images have been rebuilt as clean Android-safe 8-bit RGB PNG files.

## Replace the two files on GitHub

1. Extract `FitHub_1.6.5_ANDROID_IMAGE_HOTFIX.zip`.
2. Open the FitHub repository on GitHub.
3. Go to `assets/train_v2/movements`.
4. Open `jump_rope.png`, select the trash icon, and commit the deletion.
5. Open `leg_press.png`, select the trash icon, and commit the deletion.
6. Return to `assets/train_v2/movements` and select **Add file → Upload files**.
7. Upload the corrected `jump_rope.png` and `leg_press.png` from the hotfix folder.
8. Commit with: `Fix Android-safe Train images`.
9. Open **Actions**, run the APK workflow again, and download the new artifact after it turns green.

No SQL, Supabase, dependency, or code changes are needed for this hotfix.
