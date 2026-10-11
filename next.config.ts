import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Masque l'indicateur visuel du mode développement (le badge « N » en bas à
  // gauche). `false` retire l'indicateur : Next.js continue de signaler les
  // erreurs de compilation et d'exécution, et cette option n'a aucun effet en
  // production (l'indicateur n'y est jamais rendu).
  devIndicators: false,
  // Le serveur de développement n'accepte par défaut que les requêtes venant de
  // `localhost`. Depuis un téléphone ou un autre poste du réseau local, le
  // navigateur envoie `Origin: http://192.168.x.x:3000` : le handshake du
  // WebSocket HMR est alors refusé, le client React ne s'hydrate jamais, et la
  // page reste figée (blocs animés bloqués à opacity 0, boutons inertes).
  //
  // Seul le nom d'hôte est comparé, sans schéma ni port. `*` remplace exactement
  // un libellé, donc `*.*.*.*` couvre toutes les adresses IPv4, y compris celle
  // que le DHCP attribue au poste. Cette option est ignorée en production.
  allowedDevOrigins: ["*.*.*.*"],
  images: {
    // Uniquement du WebP, volontairement pas d'AVIF.
    //
    // Les photos stockées sur Supabase sont des PNG de 0,3 à 1 Mo, servis par
    // une liaison lente (4 à 6 s pour une image). Encoder un PNG de 1 Mo en AVIF
    // mobilise plusieurs secondes de CPU par image et par largeur : en
    // development, le serveur saturait (plus de 100 % de CPU), abandonnait
    // l'encodage au bout du délai interne, renvoyait une erreur 500, et finissait
    // par refuser toute connexion sur l'adresse IP locale. Le WebP est encodé
    // plusieurs fois plus vite et reste très largement plus léger que le PNG
    // d'origine ; l'affichage est identique.
    formats: ["image/webp"],
    // Découpes alignées sur les breakpoints demandés, pour que next/image
    // serve exactement la bonne taille au navigateur.
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1440, 1920, 2560],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    // Conserver les images optimisées sur disque une semaine.
    //
    // En development, le cache est vide par défaut : chaque visite retélécharge
    // la photo depuis Supabase et la réencode, ce qui est la source principale
    // de la lenteur sur téléphone. Avec ce délai, chaque image n'est téléchargée
    // et encodée qu'une fois, puis servie instantanément depuis le disque.
    minimumCacheTTL: 604800,
    // Les photos des biens sont servies par le bucket public Supabase Storage.
    // Sans cette autorisation, next/image refuse de optimiser une URL distante
    // et l'image ne s'affiche pas.
    //
    // La restriction au chemin du bucket limite l'optimisation aux photos de
    // propriétés, pas à l'ensemble du domaine Supabase.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Les photos d'un bien sont envoyées dans la requête du formulaire
      // (Server Action). La limite par défaut de 1 Mo refuserait dès la
      // première image.
      //
      // On aligne la limite réseau sur le pire cas réellement autorisé par le
      // formulaire : PHOTO_MAX_COUNT (12) x PHOTO_MAX_BYTES (5 Mo) = 60 Mo,
      // plus les champs texte et la marge d'encodage multipart. Le plafond de
      // Next est arrondi à 64 Mo.
      //
      // Un fichier trop lourd reste refusé AVANT l'envoi, par la validation du
      // formulaire ; cette limite n'est qu'un filet de sécurité, pas un
      // contrôle d'accès.
      bodySizeLimit: "64mb",
    },
    // Délai d'encodage de l'optimiseur d'images, relevé de 7 s à 60 s.
    //
    // Le délai de 7 s est trop court ici : il compte le téléchargement de la
    // photo depuis Supabase (4 à 6 s) PLUS l'encodage, si bien qu'un simple
    // passage en 500 alors que tout fonctionnait. Ce réglage ne sert que de
    // filet : les images sont mises en cache (minimumCacheTTL) et ne repassent
    // pas par l'optimiseur.
    imgOptTimeoutInSeconds: 60,
  },
};

export default nextConfig;
