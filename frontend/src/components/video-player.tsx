"use client";

import React, { useState, useEffect } from "react";
import Plyr from "plyr-react";

interface VideoPlayerProps {
  src: string;
  type?: string;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, type, className }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [src]);

  const handleLoadedMetadata = () => {
    setLoading(false);
  };

  const handleError = (
    event: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    setError("Error loading video");
    if (event.target) {
      console.log(
        "Video load error:",
        (event.target as HTMLVideoElement).error
      );
    }
  };

  const plyrProps = {
    source: {
      type: (type as Plyr.MediaType) || "video",
      sources: [
        {
          src: src,
          type: type || "video/mp4",
        },
      ],
    },
    options: {
      autoplay: true,
    },
  };

  return (
    <div className={`${className}`}>
      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      <Plyr
        {...plyrProps}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
      />
    </div>
  );
};

export default VideoPlayer;
