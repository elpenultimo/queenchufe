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

const DEFAULT_TITLE = '¿Qué enchufe necesitas para viajar?';
const BASE_URL = 'https://queenchufe.com';

const pathParts = window.location.pathname.split('/').filter(Boolean);
const isResultPage = pathParts.length === 2 && pathParts.every((part) => part.length === 2);

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
};

const updateFaqSchema = ({ originName, destinationName, needsAdapter, destinationPlugs }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Necesito adaptador para viajar a este país?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: needsAdapter
            ? `Sí. Desde ${originName} hacia ${destinationName} necesitas adaptador si tu enchufe no coincide con los tipos ${destinationPlugs.join(', ')}.`
            : `No. Los tipos de enchufe de ${destinationName} son compatibles con ${originName}.`,
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
          text: `En ${destinationName} se usan los enchufes tipo ${destinationPlugs.join(', ')}.`,
        },
      },
    ],
  };

  FAQ_SCHEMA.textContent = JSON.stringify(schema);
};

fetch('/data/countries.json')
  .then((response) => response.json())
  .then((countries) => {
    const entries = Object.entries(countries).sort(([, a], [, b]) => a.name.localeCompare(b.name));

    entries.forEach(([code, data]) => {
      ORIGIN_SELECT?.appendChild(formatCountryOption(code, data.name));
      DEST_SELECT?.appendChild(formatCountryOption(code, data.name));
    });

    if (!isResultPage) {
      updateSeo({
        title: DEFAULT_TITLE,
        description: 'Descubre si necesitas adaptador de enchufe al viajar entre países. Tipos de enchufe, voltaje y frecuencia en segundos.',
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

    const destinationPlugSet = new Set(destination.plugs);
    const originPlugSet = new Set(origin.plugs);
    const hasCompatiblePlug = [...destinationPlugSet].some((plug) => originPlugSet.has(plug));
    const needsAdapter = !hasCompatiblePlug;

    RESULT_MESSAGE.textContent = needsAdapter
      ? '❌ Sí necesitas adaptador'
      : '✅ No necesitas adaptador';
    RESULT_MESSAGE.classList.add(needsAdapter ? 'status-danger' : 'status-success');
    RESULT_SUBTITLE.textContent = `Viajas desde ${origin.name} hacia ${destination.name}.`;

    setPlugPills(ORIGIN_PLUGS, origin.plugs);
    setPlugPills(DEST_PLUGS, destination.plugs);

    const voltageCompatible = isVoltageCompatible(origin.voltage, destination.voltage);
    VOLTAGE_TEXT.textContent = `${origin.name}: ${origin.voltage} / ${origin.frequency}. ${destination.name}: ${destination.voltage} / ${destination.frequency}. ` +
      (voltageCompatible
        ? 'El voltaje es compatible.'
        : 'El voltaje es diferente, considera usar transformador si tu equipo no es multivoltaje.');

    FAQ_ADAPTER.textContent = needsAdapter
      ? `Sí. Ningún tipo de enchufe de ${destination.name} (${destination.plugs.join(', ')}) es compatible con ${origin.name}.`
      : `No. Hay al menos un tipo de enchufe compatible entre ${origin.name} y ${destination.name}.`;
    FAQ_PLUGS.textContent = `En ${destination.name} se usan los enchufes tipo ${destination.plugs.join(', ')}.`;

    updateSeo({
      title: `Qué enchufe se usa en ${destination.name} desde ${origin.name}`,
      description: `Comprueba si necesitas adaptador al viajar desde ${origin.name} a ${destination.name}. Tipos de enchufe, voltaje y frecuencia actualizados.`,
      canonical: `${BASE_URL}/${originCode.toLowerCase()}/${destinationCode.toLowerCase()}`,
    });

    updateFaqSchema({
      originName: origin.name,
      destinationName: destination.name,
      needsAdapter,
      destinationPlugs: destination.plugs,
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
