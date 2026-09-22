import Experience from "@/components/Experience";
import { existingImagePaths } from "@/lib/assets";

export default function Home() {
  return <Experience assets={existingImagePaths()} />;
}
