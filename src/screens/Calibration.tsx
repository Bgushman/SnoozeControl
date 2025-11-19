import { useEffect, useRef, useState } from "react";
import { View, Text, Button, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { saveThresholds } from "../lib/store";
import { mockEar } from "../lib/inference.mock";

type Step = 1 | 2;

export default function Calibration() {
  const [perm, requestPerm] = useCameraPermissions(); // Camera permaissions
  const [step, setStep] = useState<Step>(1); // Calibration step
  const [openVals, setOpenVals] = useState<number[]>([]); // Recorded EARs with eyes open
  const [closedVals, setClosedVals] = useState<number[]>([]); // Recorded EARs with eyes closed
  const [liveEar, setLiveEar] = useState<number>(0.28); // Current live EAR
  const sampler = useRef<NodeJS.Timeout | null>(null); // Sampler interval
  const ticker = useRef<NodeJS.Timeout | null>(null); // Live EAR ticker interval
  const [isRecording, setIsRecording] = useState(false); // Recording state

  // Live EAR ticker (mock for now). Swap mockEar() with your CNN hook output.
  useEffect(() => { // Live EAR ticker
    ticker.current = setInterval(() => { // Interval to update live EAR
      setLiveEar(mockEar()); // TODO: replace with real CNN EAR/drowsy score !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    }, 100); // ~10Hz live HUD 
    return () => { if (ticker.current) clearInterval(ticker.current); }; // Cleanup on unmount
  }, []); // Empty dependency array to run once on mount

  useEffect(() => {
    return () => { // cleanup on unmount
      if (sampler.current) clearInterval(sampler.current); // clear sampler interval
      if (ticker.current) clearInterval(ticker.current); // clear ticker interval
    };
  }, []);

  const record = (setFn: (v: number[]) => void) => {
    if (sampler.current) clearInterval(sampler.current); // clear existing sampler
    setIsRecording(true); // set recording state
    const arr: number[] = []; // array to hold samples
    let count = 0; // sample count
    sampler.current = setInterval(() => {
      // capture the current live EAR sample
      arr.push(liveEar);
      count++;
      if (count >= 50) { // ~3s at 60ms → here we used 50 samples @100ms ≈ 5s, tweak as desired
        if (sampler.current) clearInterval(sampler.current);
        setFn(arr);
        setIsRecording(false);
      }
    }, 100);
  };

  const computeAndSave = async () => {
    const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length); // avoid div by 0
    const earOpen = mean(openVals); // average EAR with eyes open
    const earClosed = mean(closedVals); // average EAR with eyes closed
    // personalized threshold between closed and open; adjust k after testing
    const k = 0.25;
    const earThreshold = earClosed + k * (earOpen - earClosed); // threshold calculation
    await saveThresholds({ earOpen, earClosed, earThreshold }); // save to storage 
    alert(
      `Saved threshold: ${earThreshold.toFixed(3)}\n` + // show threshold 
      `Open avg: ${earOpen.toFixed(3)}  •  Closed avg: ${earClosed.toFixed(3)}` // show saved values
    );
  };

  // Permission UI
  if (!perm || !perm.granted) { // if no permission
    return ( // request permission UI
      <View style={{ flex:1, justifyContent:"center", alignItems:"center", padding:20 }}> 
        <Text style={{ textAlign:"center", marginBottom:12 }}> 
          Camera permission is required for calibration. 
        </Text>
        <Button title="Grant Camera Permission" onPress={requestPerm} /> 
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Live front camera preview */}
      <CameraView style={{ flex: 1 }} facing="front" />

      {/* Overlay HUD */}
      <View style={{
        position:"absolute", left:0, right:0, bottom:0,
        backgroundColor:"rgba(0,0,0,0.65)", padding:14
      }}>
        <Text style={{ color:"#fff", fontSize:18, fontWeight:"700", textAlign:"center", marginBottom:6 }}>
          Calibration
        </Text>

        <Text style={{ color:"#fff", textAlign:"center", marginBottom:8 }}>
          Live EAR: {liveEar.toFixed(3)} {isRecording ? " • Recording…" : ""}
        </Text>

        {step === 1 ? (
          <>
            <Text style={{ color:"#ddd", textAlign:"center", marginBottom:8 }}>
              Step 1 — Keep your eyes OPEN and look straight ahead.
            </Text>
            <Button
              title={isRecording ? "Recording OPEN…" : "Start Recording (Open)"}
              onPress={() => record(setOpenVals)}
              disabled={isRecording}
            />
            <Text style={{ color:"#bbb", textAlign:"center", marginTop:8 }}>
              Samples captured: {openVals.length > 0 ? openVals.length : 0}
              {openVals.length > 0 && ` • avg ${(
                openVals.reduce((s,x)=>s+x,0)/openVals.length
              ).toFixed(3)}`}
            </Text>
            <View style={{ height:8 }} />
            <Button
              title="Next"
              onPress={() => setStep(2)}
              disabled={isRecording || openVals.length === 0}
            />
          </>
        ) : (
          <>
            <Text style={{ color:"#ddd", textAlign:"center", marginBottom:8 }}>
              Step 2 — Gently CLOSE your eyes and hold.
            </Text>
            <Button
              title={isRecording ? "Recording CLOSED…" : "Start Recording (Closed)"}
              onPress={() => record(setClosedVals)}
              disabled={isRecording}
            />
            <Text style={{ color:"#bbb", textAlign:"center", marginTop:8 }}>
              Samples captured: {closedVals.length > 0 ? closedVals.length : 0}
              {closedVals.length > 0 && ` • avg ${(
                closedVals.reduce((s,x)=>s+x,0)/closedVals.length
              ).toFixed(3)}`}
            </Text>
            <View style={{ height:8 }} />
            <Button
              title="Save Threshold"
              onPress={computeAndSave}
              disabled={isRecording || closedVals.length === 0 || openVals.length === 0}
            />
          </>
        )}

        {/* Small spinner when recording */}
        {isRecording && (
          <View style={{ marginTop:8, alignItems:"center" }}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </View>
    </View>
  );
}
