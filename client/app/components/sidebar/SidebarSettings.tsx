import { Settings2 } from "lucide-react";
import SidebarItem from "./SidebarItem";

interface Props {
    size?: number;
    onClick: () => void;
}

export default function SidebarSettings({ size, onClick }: Props) {
    return (
        <SidebarItem space={30} keyHint="\" name="Settings" onClick={onClick} modal={null}>
            <Settings2 size={size} />
        </SidebarItem>
    )
}