import React from 'react';

export default function AvatarGrid() {
  return (
    <div className="w-1/2 relative flex items-center justify-center bg-white">
      {/* Full screen cross lines */}
      <div className="absolute inset-0">
        {/* Vertical line */}
        <div className="absolute left-1/2 top-0 w-[2px] h-full bg-black transform -translate-x-1/2"></div>
        {/* Horizontal line */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black transform -translate-y-1/2"></div>
      </div>

      {/* Grid container */}
      <div className="w-full h-full grid grid-cols-2 grid-rows-2">
        {/* User Avatar Boxes - 4 identical boxes */}
        {[...Array(4)].map((_, index) => (
          <div key={index} className="flex flex-col items-center justify-center">
            <div className="w-32 h-32 bg-black rounded-full mb-3"></div>
            <div className="w-40 h-16 bg-black rounded-t-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
} 