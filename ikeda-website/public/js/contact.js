document.addEventListener('DOMContentLoaded', async () => {
  // Fill in phone / map from the company API so there's one source of truth
  try {
    const company = await fetchJSON('/api/company');
    document.querySelectorAll('[data-company="phone"]').forEach((el) => {
      el.textContent = company.phone || '';
      if (el.tagName === 'A') el.href = `tel:${company.phone}`;
    });
    document.querySelectorAll('[data-company="address"]').forEach((el) => {
      el.textContent = company.address || 'Address coming soon';
    });

    const mapSlot = document.getElementById('map-embed');
    if (mapSlot) {
      if (company.googleMapsEmbedUrl) {
        mapSlot.innerHTML = `<iframe src="${company.googleMapsEmbedUrl}" loading="lazy" allowfullscreen title="Ikeda Endoscopy Africa location"></iframe>`;
      } else {
        mapSlot.innerHTML = `<span>Add your Google Maps embed link in data/company.json (googleMapsEmbedUrl) to show the map here.</span>`;
      }
    }

    const mapLink = document.getElementById('map-link');
    if (mapLink && company.googleMapsLinkUrl) {
      mapLink.href = company.googleMapsLinkUrl;
    }
  } catch (err) {
    console.error(err);
  }

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      message: form.message.value.trim(),
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to send');

      status.textContent = "Thanks — we've received your message and will get back to you shortly.";
      status.className = 'form-status show ok';
      form.reset();
    } catch (err) {
      status.textContent = 'Something went wrong sending your message. Please call us instead.';
      status.className = 'form-status show err';
      console.error(err);
    }
  });
});
