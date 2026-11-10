import { supabase } from "@/lib/supabase";

export const ROOM_PHOTOS = [
  {
    src: "/farm-images/pig-room.jpg",
    alt: "Illustrative stock photo of pigs in an indoor farm pen",
  },
  {
    src: "/farm-images/piglets.jpg",
    alt: "Illustrative stock photo of piglets in a farm room",
  },
  {
    src: "/farm-images/pig-group.jpg",
    alt: "Illustrative stock photo of pigs in a farm enclosure",
  },
] as const;

export function getRoomPhoto(roomNumber: number, imagePath?: string | null) {
  if (imagePath) {
    const src = imagePath.startsWith("data:")
      ? imagePath
      : supabase.storage.from("room-images").getPublicUrl(imagePath).data.publicUrl;
    return { src, alt: `Photo of farm room ${roomNumber}` };
  }
  return ROOM_PHOTOS[(Math.max(1, roomNumber) - 1) % ROOM_PHOTOS.length];
}

export const FARM_FIELD_PHOTO = "/farm-images/farm-field.jpg";
export const PIG_CARE_PHOTO = "/farm-images/pig-care.jpg";
