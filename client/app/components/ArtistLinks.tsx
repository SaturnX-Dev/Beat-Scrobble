// NOTE: React 17+ no requiere `import React from 'react'` para JSX.
// Solo importa hooks específicos si los necesitas (useState, useEffect, etc.)
import { Link } from 'react-router';

type Artist = {
  id: number;
  name: string;
};

type ArtistLinksProps = {
  artists: Artist[];
};

export default function ArtistLinks({ artists }: ArtistLinksProps) {
  return (
    <>
      {artists.map((artist, index) => (
        <span key={artist.id} className='color-fg-secondary'>
          <Link className="hover:text-(--color-fg-tertiary)" to={`/artist/${artist.id}`}>{artist.name}</Link>
          {index < artists.length - 1 ? ', ' : ''}
        </span>
      ))}
    </>
  );
}

