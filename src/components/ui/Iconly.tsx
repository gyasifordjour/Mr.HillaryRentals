import { Iconly as IconlyBase } from "react-iconly";
import type { CSSProperties, HTMLAttributes } from "react";

type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, "color"> & {
  color?: string;
  fill?: string;
  size?: number;
  strokeWidth?: number;
};

const iconNames = {
  Activity: "Activity",
  AlertCircle: "Danger",
  ArrowDown: "ArrowDown",
  ArrowDownUp: "Swap",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowUpRight: "ArrowUp",
  AtSign: "Message",
  BadgeInfo: "InfoCircle",
  Bell: "Notification",
  Camera: "Camera",
  CalendarDays: "Calendar",
  CalendarPlus: "Calendar",
  ChartColumn: "Chart",
  Check: "TickSquare",
  CheckCheck: "TickSquare",
  CheckCircle2: "TickSquare",
  ChevronDown: "ChevronDown",
  ChevronLeft: "ChevronLeft",
  ChevronRight: "ChevronRight",
  CircleCheck: "TickSquare",
  CircleDollarSign: "Wallet",
  CircleHelp: "InfoCircle",
  CircleUserRound: "User",
  ClipboardCheck: "TickSquare",
  ClipboardList: "Paper",
  Clock3: "TimeCircle",
  Copy: "Document",
  Crown: "Star",
  Delete: "Delete",
  DoorOpen: "Work",
  Edit: "Edit",
  Ellipsis: "MoreCircle",
  Eye: "Show",
  EyeOff: "Hide",
  Folder: "Folder",
  Globe2: "Discovery",
  Heart: "Heart",
  House: "Home",
  Image: "Image",
  ImagePlus: "Image",
  Info: "InfoCircle",
  KeyRound: "Lock",
  LayoutDashboard: "Home",
  Leaf: "Discovery",
  LoaderCircle: "Activity",
  LockKeyhole: "Lock",
  LogOut: "Logout",
  Mail: "Message",
  MapPin: "Location",
  MapPinned: "Location",
  Maximize2: "Scan",
  MessageCircle: "Message",
  Minimize2: "Scan",
  Minus: "PaperNegative",
  Moon: "Setting",
  MoreHorizontal: "MoreCircle",
  Paperclip: "Paper",
  Pencil: "Edit",
  Phone: "Call",
  PiggyBank: "Wallet",
  Plus: "Plus",
  Printer: "Document",
  ReceiptText: "Document",
  RotateCw: "Swap",
  Save: "TickSquare",
  Scale: "Activity",
  Search: "Search",
  Send: "Send",
  Settings: "Setting",
  Share2: "Send",
  ShieldCheck: "ShieldDone",
  SlidersHorizontal: "Filter",
  Smartphone: "Video",
  Sparkles: "Discovery",
  Sprout: "Discovery",
  Star: "Star",
  Sun: "Setting",
  Trash2: "Delete",
  TrendingDown: "ArrowDown",
  TrendingUp: "ArrowUp",
  UserCheck: "User",
  UserPlus: "AddUser",
  UserRound: "User",
  UserX: "User",
  Users: "People",
  UsersRound: "People",
  WalletCards: "Wallet",
  Wifi: "VolumeUp",
  Wheat: "Discovery",
  X: "CloseSquare",
} as const;

function createIcon(name: keyof typeof iconNames) {
  return function Icon({ color = "currentColor", fill, size = 24, style, ...props }: IconProps) {
    const wrapperStyle: CSSProperties = {
      display: "inline-flex",
      lineHeight: 0,
      ...style,
    };

    return (
      <span {...props} style={wrapperStyle}>
        <IconlyBase
          name={iconNames[name]}
          size={size}
          primaryColor={color}
          filled={fill === "currentColor"}
        />
      </span>
    );
  };
}

export const Activity = createIcon("Activity");
export const AlertCircle = createIcon("AlertCircle");
export const ArrowDown = createIcon("ArrowDown");
export const ArrowDownUp = createIcon("ArrowDownUp");
export const ArrowLeft = createIcon("ArrowLeft");
export const ArrowRight = createIcon("ArrowRight");
export const ArrowUp = createIcon("ArrowUp");
export const ArrowUpRight = createIcon("ArrowUpRight");
export const AtSign = createIcon("AtSign");
export const BadgeInfo = createIcon("BadgeInfo");
export const Bell = createIcon("Bell");
export const Camera = createIcon("Camera");
export const CalendarDays = createIcon("CalendarDays");
export const CalendarPlus = createIcon("CalendarPlus");
export const ChartColumn = createIcon("ChartColumn");
export const Check = createIcon("Check");
export const CheckCheck = createIcon("CheckCheck");
export const CheckCircle2 = createIcon("CheckCircle2");
export const ChevronDown = createIcon("ChevronDown");
export const ChevronLeft = createIcon("ChevronLeft");
export const ChevronRight = createIcon("ChevronRight");
export const CircleCheck = createIcon("CircleCheck");
export const CircleDollarSign = createIcon("CircleDollarSign");
export const CircleHelp = createIcon("CircleHelp");
export const CircleUserRound = createIcon("CircleUserRound");
export const ClipboardCheck = createIcon("ClipboardCheck");
export const ClipboardList = createIcon("ClipboardList");
export const Clock3 = createIcon("Clock3");
export const Copy = createIcon("Copy");
export const Crown = createIcon("Crown");
export const Delete = createIcon("Delete");
export const DoorOpen = createIcon("DoorOpen");
export const Edit = createIcon("Edit");
export const Ellipsis = createIcon("Ellipsis");
export const Eye = createIcon("Eye");
export const EyeOff = createIcon("EyeOff");
export const Folder = createIcon("Folder");
export const Globe2 = createIcon("Globe2");
export const Heart = createIcon("Heart");
export const House = createIcon("House");
export const Image = createIcon("Image");
export const ImagePlus = createIcon("ImagePlus");
export const Info = createIcon("Info");
export const KeyRound = createIcon("KeyRound");
export const LayoutDashboard = createIcon("LayoutDashboard");
export const Leaf = createIcon("Leaf");
export const LoaderCircle = createIcon("LoaderCircle");
export const LockKeyhole = createIcon("LockKeyhole");
export const LogOut = createIcon("LogOut");
export const Mail = createIcon("Mail");
export const MapPin = createIcon("MapPin");
export const MapPinned = createIcon("MapPinned");
export const Maximize2 = createIcon("Maximize2");
export const MessageCircle = createIcon("MessageCircle");
export const Minimize2 = createIcon("Minimize2");
export const Minus = createIcon("Minus");
export const Moon = createIcon("Moon");
export const MoreHorizontal = createIcon("MoreHorizontal");
export const Paperclip = createIcon("Paperclip");
export const Pencil = createIcon("Pencil");
export const Phone = createIcon("Phone");
export const PiggyBank = createIcon("PiggyBank");
export const Plus = createIcon("Plus");
export const Printer = createIcon("Printer");
export const ReceiptText = createIcon("ReceiptText");
export const RotateCw = createIcon("RotateCw");
export const Save = createIcon("Save");
export const Scale = createIcon("Scale");
export const Search = createIcon("Search");
export const Send = createIcon("Send");
export const Settings = createIcon("Settings");
export const Share2 = createIcon("Share2");
export const ShieldCheck = createIcon("ShieldCheck");
export const SlidersHorizontal = createIcon("SlidersHorizontal");
export const Smartphone = createIcon("Smartphone");
export const Sparkles = createIcon("Sparkles");
export const Sprout = createIcon("Sprout");
export const Star = createIcon("Star");
export const Sun = createIcon("Sun");
export const Trash2 = createIcon("Trash2");
export const TrendingDown = createIcon("TrendingDown");
export const TrendingUp = createIcon("TrendingUp");
export const UserCheck = createIcon("UserCheck");
export const UserPlus = createIcon("UserPlus");
export const UserRound = createIcon("UserRound");
export const UserX = createIcon("UserX");
export const Users = createIcon("Users");
export const UsersRound = createIcon("UsersRound");
export const WalletCards = createIcon("WalletCards");
export const Wifi = createIcon("Wifi");
export const Wheat = createIcon("Wheat");
export const X = createIcon("X");
