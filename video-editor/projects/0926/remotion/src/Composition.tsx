import { Composition } from "remotion";
import scenes from "./scenes.json";
import { Picture } from "./Picture";

// Each video's cards register here (id, size and length in scenes.json); animated shots have their own entry in src/<topic>/.
const components = {
  Picture,
};

export const MyComposition: React.FC = () => (
  <>
    {scenes.map((scene) => (
      <Composition key={scene.id} {...scene} component={components[scene.id as keyof typeof components]} />
    ))}
  </>
);
