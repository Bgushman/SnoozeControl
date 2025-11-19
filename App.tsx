import { NavigationContainer } from "@react-navigation/native";
import RootNav from "./src/navigation/RootNav";

export default function App() {
  return (
    <NavigationContainer>
      <RootNav />
    </NavigationContainer>
  );
}
