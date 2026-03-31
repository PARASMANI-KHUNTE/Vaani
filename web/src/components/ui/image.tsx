import React from "react";

type ImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  fill?: boolean;
};

export const Image = ({ fill, style, alt, ...props }: ImageProps) => {
  const mergedStyle = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
    : style;

  return <img alt={alt || ""} {...props} style={mergedStyle as React.CSSProperties} />;
};
