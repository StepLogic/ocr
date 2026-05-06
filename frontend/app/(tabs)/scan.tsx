import React, { useState, useRef, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Colors } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Configure your backend API URL
const API_URL = "https://edumetrics-production-7941.up.railway.app"; // Change to your Railway URL when deployed

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  const cameraRef = useRef<CameraView>(null);
  const tintColor = useThemeColor({}, "tint");

  const checkBackendHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/health`, { method: "GET" });
      setBackendStatus(response.ok ? "online" : "offline");
    } catch {
      setBackendStatus("offline");
    }
  }, []);

  React.useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  async function openCamera() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to scan documents.",
        );
        return;
      }
    }
    setShowCamera(true);
  }

  async function takePicture() {
    if (cameraRef.current && cameraReady) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: true,
        });
        if (photo) {
          setCapturedImage(photo as unknown as ImagePicker.ImagePickerAsset);
          setShowCamera(false);
        }
      } catch (error: any) {
        Alert.alert("Error", "Failed to capture image: " + error.message);
      }
    }
  }

  async function pickImage() {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is needed to upload images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setCapturedImage(result.assets[0]);
        setShowCamera(false);
      }
    } catch (error: any) {
      Alert.alert("Error", "Failed to pick image: " + error.message);
    }
  }

  async function uploadAndProcess() {
    if (!capturedImage) return;

    setLoading(true);
    setOcrResult(null);

    try {
      const formData = new FormData();

      if (capturedImage.base64) {
        const blob = await fetch(
          `data:image/jpeg;base64,${capturedImage.base64}`,
        ).then((res) => res.blob());
        formData.append("file", blob, "document.jpg");
      } else if (capturedImage.uri) {
        formData.append("file", {
          uri: capturedImage.uri,
          name: "document.jpg",
          type: "image/jpeg",
        } as any);
      }

      const response = await fetch(`${API_URL}/ocr`, {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      const data = await response.json();

      if (data.success) {
        setOcrResult(data.text || "No text found in the image.");
      } else {
        console.log(data);
        Alert.alert(
          "OCR Failed",
          data.error || "Could not process the document.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Upload Error",
        "Failed to process document: " + error.message,
      );
    } finally {
      setLoading(false);
    }
  }

  function retake() {
    setCapturedImage(null);
    setOcrResult(null);
    setShowCamera(true);
  }

  function reset() {
    setCapturedImage(null);
    setOcrResult(null);
    setShowCamera(false);
  }

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          ref={cameraRef}
          onCameraReady={() => setCameraReady(true)}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                onPress={() => setShowCamera(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraFrame}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={pickImage}
              >
                <MaterialIcons name="photo-library" size={28} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.captureButton,
                  !cameraReady && styles.captureButtonDisabled,
                ]}
                onPress={takePicture}
                disabled={!cameraReady}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>

              <View style={styles.placeholderButton} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Status Bar */}
      <ThemedView style={styles.statusBar}>
        <View style={styles.statusItem}>
          <View
            style={[
              styles.statusDot,
              backendStatus === "online"
                ? styles.statusOnline
                : styles.statusOffline,
            ]}
          />
          <ThemedText style={styles.statusLabel}>
            {backendStatus === "online"
              ? "Backend Connected"
              : "Backend Disconnected"}
          </ThemedText>
        </View>
        <TouchableOpacity onPress={checkBackendHealth}>
          <MaterialIcons name="refresh" size={20} color={tintColor} />
        </TouchableOpacity>
      </ThemedView>

      {/* Preview */}
      <ThemedView style={styles.previewContainer}>
        {capturedImage ? (
          <Image
            source={{
              uri:
                capturedImage.uri ||
                `data:image/jpeg;base64,${capturedImage.base64}`,
            }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="document-scanner"
              size={64}
              color={Colors.light.icon}
            />
            <ThemedText style={styles.emptyStateText}>
              No document captured
            </ThemedText>
            <ThemedText style={styles.emptyStateSubtext}>
              Use the camera or gallery to scan a document
            </ThemedText>
          </View>
        )}
      </ThemedView>

      {/* Actions */}
      {!capturedImage && (
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: tintColor }]}
            onPress={openCamera}
          >
            <MaterialIcons name="camera-alt" size={24} color="white" />
            <ThemedText style={styles.primaryButtonText}>
              Open Camera
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: tintColor }]}
            onPress={pickImage}
          >
            <MaterialIcons name="photo-library" size={24} color={tintColor} />
            <ThemedText
              style={[styles.secondaryButtonText, { color: tintColor }]}
            >
              Choose from Gallery
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {capturedImage && !loading && (
        <View style={styles.buttonGroup}>
          {!ocrResult && (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: tintColor }]}
              onPress={uploadAndProcess}
            >
              <MaterialIcons name="document-scanner" size={24} color="white" />
              <ThemedText style={styles.primaryButtonText}>
                Process Document
              </ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: tintColor }]}
            onPress={retake}
          >
            <MaterialIcons name="refresh" size={24} color={tintColor} />
            <ThemedText
              style={[styles.secondaryButtonText, { color: tintColor }]}
            >
              Retake
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.textButton} onPress={reset}>
            <ThemedText style={styles.textButtonText}>Start Over</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>
            Processing document...
          </ThemedText>
          <ThemedText style={styles.loadingSubtext}>
            This may take a few moments
          </ThemedText>
        </View>
      )}

      {ocrResult && (
        <ThemedView style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <MaterialIcons name="text-fields" size={20} color={tintColor} />
            <ThemedText style={styles.resultTitle}>Extracted Text</ThemedText>
          </View>
          <ThemedView
            style={styles.resultContent}
            lightColor="#f8f8f8"
            darkColor="#1a1a1a"
          >
            <ThemedText
              style={[
                styles.resultText,
                { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
              ]}
            >
              {ocrResult}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusOnline: {
    backgroundColor: "#4caf50",
  },
  statusOffline: {
    backgroundColor: "#f44336",
  },
  statusLabel: {
    fontSize: 13,
  },
  previewContainer: {
    borderRadius: 16,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
    opacity: 0.6,
  },
  buttonGroup: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  textButton: {
    alignItems: "center",
    padding: 12,
  },
  textButtonText: {
    fontSize: 14,
    opacity: 0.6,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.6,
  },
  resultContainer: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultContent: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
    padding: 20,
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraFrame: {
    alignSelf: "center",
    width: 280,
    height: 380,
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "white",
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "white",
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "white",
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "white",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 30,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "white",
  },
  placeholderButton: {
    width: 50,
    height: 50,
  },
});
