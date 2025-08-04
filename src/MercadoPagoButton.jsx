import React, { useEffect, useRef } from 'react';

function MercadoPagoButton({ preferenceId }) {
  const mpRef = useRef(null);

  useEffect(() => {
    // Limpiar contenido anterior
    if (mpRef.current) {
      mpRef.current.innerHTML = '';
    }

    // Crear script MercadoPago
    const script = document.createElement('script');
    script.src = 'https://www.mercadopago.cl/integrations/v1/web-payment-checkout.js';
    script.setAttribute('data-preference-id', preferenceId);
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
  }, [preferenceId]);

  return <div ref={mpRef}></div>;
}

export default MercadoPagoButton;
