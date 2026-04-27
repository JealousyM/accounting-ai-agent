'use client';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface Props {
  src: string;
  alt: string;
  caption: string;
  placeholderHint: string;
}

export function GuideScreenshot({ src, alt, caption, placeholderHint }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="my-6">
      {failed ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-8 flex flex-col items-center justify-center gap-3 min-h-[200px]">
          <ImageIcon className="w-10 h-10 text-gray-400" aria-hidden="true" />
          <div className="text-sm text-gray-600 dark:text-gray-400 italic text-center max-w-md">
            {placeholderHint}
          </div>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 w-full"
        />
      )}
      <figcaption className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
        {caption}
      </figcaption>
    </figure>
  );
}
