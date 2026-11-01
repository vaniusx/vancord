/**
 * One icon set for the whole app.
 *
 * Icons are Phosphor, drawn solid (`fill`), because the interface uses them as
 * small solid marks rather than 1.5 px outlines: at 14–16 px an outline turns
 * to mush, while a filled glyph keeps its shape. Every module imports from
 * here, so changing the weight or swapping the library happens in one place.
 *
 * The export names keep the previous outline-library names, so call sites did
 * not have to change when the set moved over.
 */
import { forwardRef } from "react";
import * as Ph from "@phosphor-icons/react";
import type { IconProps } from "@phosphor-icons/react";

type PhosphorComponent = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

/**
 * Wraps a Phosphor icon in the solid weight. `bold` is used for spinners so a
 * rotating disc does not read as a filled blob.
 */
function solid(Base: PhosphorComponent, weight: IconProps["weight"] = "fill") {
  const Wrapped = forwardRef<SVGSVGElement, IconProps>((props, ref) => (
    <Base ref={ref} weight={weight} {...props} />
  ));
  Wrapped.displayName = `Solid(${Base.displayName ?? "Icon"})`;
  return Wrapped;
}

// Actions
export const Plus = solid(Ph.Plus);
export const Minus = solid(Ph.Minus);
export const X = solid(Ph.X);
export const XIcon = solid(Ph.X);
export const Check = solid(Ph.Check);
export const CheckIcon = solid(Ph.Check);
export const CircleCheckIcon = solid(Ph.CheckCircle);
export const Trash2 = solid(Ph.Trash);
export const Pencil = solid(Ph.PencilSimple);
export const Copy = solid(Ph.Copy);
export const Pin = solid(Ph.PushPin);
export const Send = solid(Ph.PaperPlaneRight);
export const Paperclip = solid(Ph.Paperclip);
export const Upload = solid(Ph.UploadSimple);
export const Search = solid(Ph.MagnifyingGlass);
export const RefreshCw = solid(Ph.ArrowsClockwise);
export const Play = solid(Ph.Play);
export const Maximize2 = solid(Ph.ArrowsOut);
export const CornerUpLeft = solid(Ph.ArrowBendUpLeft);
export const ArrowDown = solid(Ph.ArrowDown);
export const LogOut = solid(Ph.SignOut);
export const PanelLeftOpen = solid(Ph.SidebarSimple);
export const Settings = solid(Ph.Gear);
export const Settings2 = solid(Ph.SlidersHorizontal);
export const Terminal = solid(Ph.TerminalWindow);

// Navigation
export const ChevronDown = solid(Ph.CaretDown);
export const ChevronDownIcon = solid(Ph.CaretDown);
export const ChevronRightIcon = solid(Ph.CaretRight);
export const ChevronUpIcon = solid(Ph.CaretUp);
export const Compass = solid(Ph.Compass);

// Communication
export const MessageCircle = solid(Ph.ChatCircle);
export const MessageSquare = solid(Ph.ChatCentered);
export const AtSign = solid(Ph.At);
export const Mail = solid(Ph.Envelope);
export const Inbox = solid(Ph.Tray);
export const Phone = solid(Ph.Phone);
export const PhoneOff = solid(Ph.PhoneDisconnect);
export const Video = solid(Ph.VideoCamera);
export const VideoOff = solid(Ph.VideoCameraSlash);
export const Mic = solid(Ph.Microphone);
export const MicOff = solid(Ph.MicrophoneSlash);
export const Monitor = solid(Ph.Monitor);
export const MonitorUp = solid(Ph.Screencast);
export const Volume2 = solid(Ph.SpeakerHigh);
export const VolumeX = solid(Ph.SpeakerSlash);
export const Smile = solid(Ph.Smiley);
export const SmilePlus = solid(Ph.Smiley);
export const Gift = solid(Ph.Gift);

// People
export const User = solid(Ph.User);
export const UserRound = solid(Ph.UserCircle);
export const UserPlus = solid(Ph.UserPlus);
export const UserRoundX = solid(Ph.UserMinus);
export const Users = solid(Ph.Users);
export const Shield = solid(Ph.Shield);
export const ShieldCheck = solid(Ph.ShieldCheck);
export const ShieldOff = solid(Ph.ShieldSlash);
export const ShieldAlert = solid(Ph.ShieldWarning);
export const LogIn = solid(Ph.SignIn);

// Spaces and time
export const Hash = solid(Ph.Hash);
export const CalendarDays = solid(Ph.CalendarDots);
export const Clock = solid(Ph.Clock);
export const MapPin = solid(Ph.MapPin);
export const Frame = solid(Ph.FrameCorners);
export const Tags = solid(Ph.Tag);
export const Type = solid(Ph.TextT);

// Status and badges
export const AlertCircle = solid(Ph.WarningCircle);
export const TriangleAlert = solid(Ph.Warning);
export const TriangleAlertIcon = solid(Ph.Warning);
export const InfoIcon = solid(Ph.Info);
export const CircleX = solid(Ph.XCircle);
export const OctagonXIcon = solid(Ph.XCircle);
export const BadgeCheck = solid(Ph.SealCheck);
export const Crown = solid(Ph.Crown);
export const Sparkles = solid(Ph.Sparkle);
export const Flame = solid(Ph.Fire);
export const Zap = solid(Ph.Lightning);
export const PackageCheck = solid(Ph.Package);

// Media and appearance
export const Palette = solid(Ph.Palette);
export const Eye = solid(Ph.Eye);
export const EyeOff = solid(Ph.EyeSlash);
export const Moon = solid(Ph.Moon);
export const Sun = solid(Ph.Sun);
export const Square = solid(Ph.Square);
export const Gamepad2 = solid(Ph.GameController);

// Security
export const KeyRound = solid(Ph.Key);
export const Lock = solid(Ph.Lock);
export const Link2 = solid(Ph.Link);

// Loading
export const Loader2 = solid(Ph.CircleNotch, "bold");
export const Loader2Icon = solid(Ph.CircleNotch, "bold");

// Connectivity
export const WifiOff = solid(Ph.WifiSlash);
