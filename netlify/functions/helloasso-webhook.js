/**
 * GPBC — Webhook HelloAsso
 * Reçoit automatiquement chaque paiement HelloAsso
 * et crée la licence + écriture comptable dans Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Clés Supabase (variables d'environnement Netlify)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

exports.handler = async (event, context) => {

  // Vérifier que c'est bien un POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parser les données HelloAsso
    const data = JSON.parse(event.body);
    console.log('HelloAsso webhook reçu:', JSON.stringify(data));

    // HelloAsso envoie un objet "data" avec les infos du paiement
    const payload = data.data || data;

    // Extraire les informations selon le format HelloAsso
    // Format HelloAsso v5 API
    const order = payload.order || payload;
    const payer = payload.payer || order.payer || {};
    const items = payload.items || order.items || [];

    // Initialiser Supabase avec la clé secrète
    const DB = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

    // Traiter chaque article de la commande
    for (const item of items) {
      const prenom = payer.firstName || item.user?.firstName || '';
      const nom = payer.lastName || item.user?.lastName || '';
      const email = payer.email || item.user?.email || '';
      const montant = (item.amount || order.amount || 0) / 100; // HelloAsso envoie en centimes
      const date = new Date().toISOString().split('T')[0];

      // Détecter la catégorie depuis le nom du formulaire ou de l'article
      const nomArticle = (item.name || item.customFields?.[0]?.answer || '').toLowerCase();
      let categorie = 'À définir';
      if (nomArticle.includes('u5') || nomArticle.includes('u 5')) categorie = 'U5';
      else if (nomArticle.includes('u7') || nomArticle.includes('u 7')) categorie = 'U7';
      else if (nomArticle.includes('u9') || nomArticle.includes('u 9')) categorie = 'U9';
      else if (nomArticle.includes('u11') || nomArticle.includes('u 11')) categorie = 'U11';
      else if (nomArticle.includes('u13') || nomArticle.includes('u 13')) categorie = 'U13';
      else if (nomArticle.includes('u15') || nomArticle.includes('u 15')) categorie = 'U15';
      else if (nomArticle.includes('u18') || nomArticle.includes('u 18')) categorie = 'U18';
      else if (nomArticle.includes('senior')) categorie = 'Seniors';

      // Tarifs GPBC pour calculer la part comité
      const TARIFS = {
        U5:{prix:110,comite:51}, U7:{prix:110,comite:51}, U9:{prix:110,comite:51},
        U11:{prix:150,comite:71}, U13:{prix:150,comite:71},
        U15:{prix:170,comite:71}, U18:{prix:170,comite:71},
        Seniors:{prix:130,comite:95}, 'À définir':{prix:0,comite:0}
      };
      const tarif = TARIFS[categorie] || {prix:0, comite:0};
      const restant = Math.max(0, tarif.prix - montant);
      const statut = restant === 0 ? 'VALIDÉE' : montant === 0 ? 'IMPAYÉE' : 'PARTIELLE';

      // Récupérer champs personnalisés HelloAsso (date de naissance, téléphone...)
      const customFields = item.customFields || [];
      let dateNaissance = null;
      let telephone = '';
      let nomJoueuse = prenom; // Par défaut le payeur
      let prenomJoueuse = nom;

      customFields.forEach(field => {
        const label = (field.label || field.name || '').toLowerCase();
        const value = field.answer || field.value || '';
        if (label.includes('naissance') || label.includes('ddn')) dateNaissance = value;
        if (label.includes('téléphone') || label.includes('tel') || label.includes('phone')) telephone = value;
        if (label.includes('prénom') && label.includes('joueuse')) prenomJoueuse = value;
        if (label.includes('nom') && label.includes('joueuse')) nomJoueuse = value;
      });

      // Vérifier si la licence existe déjà (éviter les doublons)
      const { data: existing } = await DB
        .from('licences')
        .select('id')
        .eq('email', email)
        .eq('saison', '2026-2027')
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Licence déjà existante pour ${email} — ignorée`);
        continue;
      }

      // Créer la licence dans Supabase
      const { error: licError } = await DB.from('licences').insert({
        prenom: prenomJoueuse || prenom,
        nom: nomJoueuse || nom,
        email,
        telephone,
        date_naissance: dateNaissance,
        categorie,
        categorie_effective: categorie,
        tarif: tarif.prix || montant,
        part_comite: tarif.comite,
        net_club: (tarif.prix || montant) - tarif.comite,
        pmt_helloasso: montant,
        total_percu: montant,
        restant_du: restant,
        statut,
        source: 'HelloAsso',
        saison: '2026-2027',
        consentement_rgpd: true,
        date_consentement: new Date().toISOString(),
      });

      if (licError) {
        console.error('Erreur création licence:', licError);
        continue;
      }

      // Créer l'écriture comptable automatiquement
      if (montant > 0) {
        const { error: ecrError } = await DB.from('ecritures').insert({
          type: 'recette',
          date,
          montant,
          categorie: 'Adhésion / Licence',
          tiers: `${prenomJoueuse || prenom} ${nomJoueuse || nom} (${categorie})`,
          mode: 'HelloAsso',
          description: `Licence ${categorie} — HelloAsso automatique — ${statut}`,
          en_attente: false,
          est_licence: true,
        });

        if (ecrError) console.error('Erreur création écriture:', ecrError);
      }

      console.log(`✅ Licence créée : ${prenomJoueuse || prenom} ${nomJoueuse || nom} (${categorie}) — ${montant}€ — ${statut}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Webhook traité avec succès' })
    };

  } catch (error) {
    console.error('Erreur webhook HelloAsso:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
