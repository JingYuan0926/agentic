import React from 'react';

export default function AvatarGrid() {
  return (
    <div className="w-1/2 flex items-center justify-center">
      <div className="relative w-[600px] h-[600px] grid grid-cols-2 gap-0">
        {/* Vertical dividing line */}
        <div className="absolute left-1/2 top-0 w-[2px] h-full bg-black transform -translate-x-1/2"></div>
        
        {/* Horizontal dividing line */}
        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black transform -translate-y-1/2"></div>
        
        {/* User Avatar Boxes - 4 identical boxes */}
        {[...Array(4)].map((_, index) => (
          <div key={index} className="flex flex-col items-center justify-center p-8">
            <div className="w-32 h-32 bg-black rounded-full mb-3"></div>
            <div className="w-40 h-16 bg-black rounded-t-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
} 