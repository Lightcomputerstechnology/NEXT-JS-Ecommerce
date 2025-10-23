import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { urlFor } from '../lib/client';

const Product = ({ product: { image, name, slug, price } }) => {
  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  return (
    <Link href={`/product/${slug.current}`}>
      <div className="product-card">
        {image && image[0] && (
          <Image
            src={urlFor(image[0])}
            alt={name || "Product image"}
            width={250}
            height={250}
            className="product-image"
          />
        )}
        <p className="product-name">{name}</p>
        <p className="product-price">N{numberWithCommas(price)}</p>
      </div>
    </Link>
  );
};

export default Product;
