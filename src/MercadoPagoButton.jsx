import React, { useEffect, useRef } from 'react';

function MercadoPagoButton() {
  const mpRef = useRef(null);

  useEffect(() => {
    if (mpRef.current) {
      mpRef.current.innerHTML = '';
    }

    const script = document.createElement('script');
    script.src = 'https://www.mercadopago.cl/integrations/v1/web-payment-checkout.js';
    script.setAttribute('data-preference-id', '2607742056-a3b3adf9-7c53-4af0-88a8-d30ebb25a4f6');
    script.setAttribute('data-source', 'button');
    script.async = true;

    if (mpRef.current) {
      mpRef.current.appendChild(script);
    }

    return () => {
      if (mpRef.current) {
        mpRef.current.innerHTML = '';
      }
    };
  }, []);

  return <div ref={mpRef}></div>;
}

export default MercadoPagoButton;
