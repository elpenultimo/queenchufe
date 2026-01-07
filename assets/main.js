const HOME_SECTION = document.getElementById('home');
const RESULT_SECTION = document.getElementById('result');
const ORIGIN_SELECT = document.getElementById('origin');
const DEST_SELECT = document.getElementById('destination');
const FORM = document.getElementById('search-form');

const RESULT_MESSAGE = document.getElementById('result-message');
const RESULT_SUBTITLE = document.getElementById('result-subtitle');
const ORIGIN_PLUGS = document.getElementById('origin-plugs');
const DEST_PLUGS = document.getElementById('destination-plugs');
const VOLTAGE_TEXT = document.getElementById('voltage-text');
const FAQ_ADAPTER = document.getElementById('faq-adapter');
const FAQ_PLUGS = document.getElementById('faq-plugs');
const META_DESCRIPTION = document.getElementById('meta-description');
const CANONICAL = document.getElementById('canonical');
const FAQ_SCHEMA = document.getElementById('faq-schema');
const BREADCRUMB_SCHEMA = document.getElementById('breadcrumb-schema');
const OG_TITLE = document.getElementById('og-title');
const OG_DESCRIPTION = document.getElementById('og-description');
const OG_URL = document.getElementById('og-url');
const TWITTER_TITLE = document.getElementById('twitter-title');
const TWITTER_DESCRIPTION = document.getElementById('twitter-description');

const DEFAULT_TITLE = '¿Qué enchufe necesitas para viajar?';
const BASE_URL = 'https://queenchufe.com';

const pathParts = window.location.pathname.split('/').filter(Boolean);
const isResultPage = pathParts.length === 2 && pathParts.every((part) => part.length === 2);

const COUNTRY_DISPLAY_NAMES = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['es'], { type: 'region' })
  : null;

const getCountryName = (code, fallbackName) => COUNTRY_DISPLAY_NAMES?.of(code) ?? fallbackName;

const formatCountryOption = (code, name) => {
  const option = document.createElement('option');
  option.value = code;
  option.textContent = name;
  return option;
};

const parseNumbers = (text) => {
  const matches = text.match(/\d+/g);
  return matches ? matches.map((value) => Number(value)) : [];
};

const isVoltageCompatible = (originVoltage, destinationVoltage) => {
  const originValues = new Set(parseNumbers(originVoltage));
  const destinationValues = new Set(parseNumbers(destinationVoltage));
  for (const value of originValues) {
    if (destinationValues.has(value)) {
      return true;
    }
  }
  return false;
};

const createPlugFallback = (plug) => {
  const fallback = document.createElement('span');
  fallback.className = 'plug-fallback';
  fallback.textContent = plug;
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', `Enchufe tipo ${plug}`);
  return fallback;
};

const createPlugImage = (plug, label) => {
  const image = document.createElement('img');
  image.className = 'plug-image';
  image.src = `/plugs/plug-${plug.toLowerCase()}.svg`;
  image.alt = `Enchufe tipo ${plug}`;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => {
    const fallback = createPlugFallback(plug);
    image.replaceWith(fallback);
    label?.remove();
  });
  return image;
};

const setPlugPills = (container, plugs) => {
  container.innerHTML = '';
  container.setAttribute('role', 'list');
  plugs.forEach((plug) => {
    const item = document.createElement('div');
    item.className = 'plug-item';
    item.setAttribute('role', 'listitem');

    const label = document.createElement('span');
    label.className = 'plug-label';
    label.textContent = plug;

    const image = createPlugImage(plug, label);

    item.appendChild(image);
    item.appendChild(label);
    container.appendChild(item);
  });
};

const updateSeo = ({ title, description, canonical }) => {
  document.title = title;
  META_DESCRIPTION.setAttribute('content', description);
  CANONICAL.setAttribute('href', canonical);
  OG_TITLE?.setAttribute('content', title);
  OG_DESCRIPTION?.setAttribute('content', description);
  OG_URL?.setAttribute('content', canonical);
  TWITTER_TITLE?.setAttribute('content', title);
  TWITTER_DESCRIPTION?.setAttribute('content', description);
};

const updateBreadcrumbSchema = ({ originName, destinationName, canonical }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Inicio',
        item: `${BASE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Adaptador de enchufe',
        item: `${BASE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${originName} a ${destinationName}`,
        item: canonical,
      },
    ],
  };

  BREADCRUMB_SCHEMA.textContent = JSON.stringify(schema);
};

const updateFaqSchema = ({ originName, destinationName, adapterAnswer, plugsAnswer }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Necesito adaptador para viajar a este país?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: adapterAnswer,
        },
      },
      {
        '@type': 'Question',
        name: '¿Funciona mi cargador de celular?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Si tu cargador indica “input 100–240 V”, funcionará sin problema y solo podrías necesitar adaptador físico.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Qué tipo de enchufe se usa en el país destino?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: plugsAnswer,
        },
      },
    ],
  };

  FAQ_SCHEMA.textContent = JSON.stringify(schema);
};

fetch('/data/countries.json')
  .then((response) => response.json())
  .then((countries) => {
    const countryNames = Object.fromEntries(
      Object.entries(countries).map(([code, data]) => [code, getCountryName(code, data.name)])
    );
    const entries = Object.entries(countries).sort(([codeA], [codeB]) => (
      countryNames[codeA].localeCompare(countryNames[codeB], 'es')
    ));

    entries.forEach(([code, data]) => {
      const displayName = countryNames[code];
      ORIGIN_SELECT?.appendChild(formatCountryOption(code, displayName));
      DEST_SELECT?.appendChild(formatCountryOption(code, displayName));
    });

    if (!isResultPage) {
      updateSeo({
        title: DEFAULT_TITLE,
        description: 'Descubre si necesitas adaptador de enchufe o clavija al viajar entre países. Tipos de enchufe, voltaje y frecuencia en segundos.',
        canonical: `${BASE_URL}/`,
      });
      return;
    }

    const [originCode, destinationCode] = pathParts.map((part) => part.toUpperCase());
    const origin = countries[originCode];
    const destination = countries[destinationCode];

    if (!origin || !destination) {
      updateSeo({
        title: 'País no encontrado | QueEnchufe.com',
        description: 'No encontramos los países indicados. Vuelve al buscador para comprobar enchufes y voltaje.',
        canonical: `${BASE_URL}/`,
      });
      RESULT_SECTION.classList.add('hidden');
      HOME_SECTION.classList.remove('hidden');
      return;
    }

    HOME_SECTION.classList.add('hidden');
    RESULT_SECTION.classList.remove('hidden');

    const originName = countryNames[originCode] ?? origin.name;
    const destinationName = countryNames[destinationCode] ?? destination.name;

    const destinationPlugSet = new Set(destination.plugs);
    const originPlugSet = new Set(origin.plugs);
    const hasCompatiblePlug = [...destinationPlugSet].some((plug) => originPlugSet.has(plug));
    const needsAdapter = !hasCompatiblePlug;
    const canonicalUrl = `${BASE_URL}/${originCode.toLowerCase()}/${destinationCode.toLowerCase()}`;

    RESULT_MESSAGE.textContent = needsAdapter
      ? '❌ Sí necesitas adaptador'
      : '✅ No necesitas adaptador';
    RESULT_MESSAGE.classList.add(needsAdapter ? 'status-danger' : 'status-success');
    RESULT_SUBTITLE.textContent = `Viajas desde ${originName} hacia ${destinationName}.`;

    setPlugPills(ORIGIN_PLUGS, origin.plugs);
    setPlugPills(DEST_PLUGS, destination.plugs);

    const voltageCompatible = isVoltageCompatible(origin.voltage, destination.voltage);
    VOLTAGE_TEXT.textContent = `${originName}: ${origin.voltage} / ${origin.frequency}. ${destinationName}: ${destination.voltage} / ${destination.frequency}. ` +
      (voltageCompatible
        ? 'El voltaje es compatible.'
        : 'El voltaje es diferente, considera usar transformador si tu equipo no es multivoltaje.');

    const adapterAnswer = needsAdapter
      ? `Sí. Ningún tipo de enchufe de ${destinationName} (${destination.plugs.join(', ')}) es compatible con ${originName}.`
      : `No. Hay al menos un tipo de enchufe compatible entre ${originName} y ${destinationName}.`;
    const plugsAnswer = `En ${destinationName} se usan los enchufes tipo ${destination.plugs.join(', ')}.`;

    FAQ_ADAPTER.textContent = adapterAnswer;
    FAQ_PLUGS.textContent = plugsAnswer;

    updateSeo({
      title: needsAdapter
        ? `Adaptador de enchufe o clavija: ${originName} → ${destinationName} | QueEnchufe.com`
        : `¿Necesitas adaptador de enchufe o clavija? ${originName} → ${destinationName} | QueEnchufe.com`,
      description: needsAdapter
        ? `Comprueba si necesitas adaptador de enchufe o clavija al viajar de ${originName} a ${destinationName}. Tipos de enchufe, voltaje y frecuencia en segundos.`
        : `Comprueba si necesitas adaptador de enchufe o clavija al viajar de ${originName} a ${destinationName}. Tipos de enchufe, voltaje y frecuencia en segundos.`,
      canonical: canonicalUrl,
    });

    updateBreadcrumbSchema({
      originName,
      destinationName,
      canonical: canonicalUrl,
    });

    updateFaqSchema({
      originName,
      destinationName,
      adapterAnswer,
      plugsAnswer,
    });
  });

FORM?.addEventListener('submit', (event) => {
  event.preventDefault();
  const origin = ORIGIN_SELECT.value.toLowerCase();
  const destination = DEST_SELECT.value.toLowerCase();
  if (!origin || !destination) {
    return;
  }
  window.location.href = `/${origin}/${destination}`;
});
