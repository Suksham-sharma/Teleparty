import Image from "next/image";
import React from "react";
interface CustomAvatarProps {
  src?: string; // The URL for the avatar image
  fallback: string; // Fallback text if the image is not available
  className?: string; // Optional additional class names
}

const CustomAvatar: React.FC<CustomAvatarProps> = ({
  src,
  fallback,
  className,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 ${
        className || ""
      }`}
    >
      {src ? (
        <Image
          width={40}
          height={40}
          src={src}
          alt={fallback}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <span className="text-sm font-medium text-gray-600">{fallback}</span>
      )}
    </div>
  );
};

export default CustomAvatar;
