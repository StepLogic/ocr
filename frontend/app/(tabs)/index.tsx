import { StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#667eea', dark: '#1D3D47' }}
      headerImage={
        <ThemedView style={styles.headerContent}>
          <ThemedText type="title" style={styles.headerTitle}>EduMetrics</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Document OCR Scanner</ThemedText>
        </ThemedView>
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Scan a Document</ThemedText>
        <ThemedText>
          Open the <ThemedText type="link">Scan tab</ThemedText> to capture or upload a document image. The app uses your camera or photo library.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Process with AI</ThemedText>
        <ThemedText>
          Tap "Process Document" to send the image to the backend. The Ollama Gemma model extracts all readable text using OCR.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Review Results</ThemedText>
        <ThemedText>
          The extracted text appears on the Scan screen. You can retake, upload another image, or start over at any time.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Backend Status</ThemedText>
        <ThemedText>
          Make sure the FastAPI backend is running at{' '}
          <ThemedText type="defaultSemiBold">http://localhost:8000</ThemedText>
          {' '}and Ollama is accessible. Check the Scan tab for a live connection indicator.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  headerTitle: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 16,
  },
});
