import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Home from "../screens/Home";
import Monitor from "../screens/Monitor";
import Calibration from "../screens/Calibration";
import History from "../screens/History";
import Settings from "../screens/Settings";

export type RootStackParamList = {
  Home: undefined;
  Monitor: undefined;
  Calibration: undefined;
  History: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNav() {
  return (
    <Stack.Navigator
      id={undefined}
      screenOptions={{
        headerTitle: "",
        headerStyle: { backgroundColor: "transparent" },
        headerShadowVisible: false,
        headerTransparent: false,
      }}
    >
      <Stack.Screen name="Home" component={Home} options={{ headerShown: false }} />
      <Stack.Screen name="Monitor" component={Monitor} />
      <Stack.Screen name="Calibration" component={Calibration} />
      <Stack.Screen name="History" component={History} />
      <Stack.Screen name="Settings" component={Settings} />
    </Stack.Navigator>
  );
}