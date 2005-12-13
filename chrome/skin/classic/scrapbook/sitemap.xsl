<?xml version="1.0" encoding="UTF-8"?>
<!--
	This is a XSL file for viewing SiteMaps created by In-depth Capture.
	The original file can be found at: chrome://scrapbook/skin/sitemap.xsl
	You can customize this file as you like.
	If you want to use your favorite CSS, change the href attribute of the link tag.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
	<xsl:output method="html" encoding="UTF-8" indent="yes" />
	<!--template for site tag-->
	<xsl:template match="/site">
		<html>
			<head>
				<title>SiteMap</title>
				<link rel="stylesheet" href="chrome://scrapbook/skin/sitemap.css" />
			</head>
			<body>
				<h1>SiteMap</h1>
				<div id="sitemap-container">
					<ul>
						<!--apply templates for homepage-->
						<xsl:apply-templates select="page" />
					</ul>
				</div>
			</body>
		</html>
	</xsl:template>
	<!--template for each page-->
	<xsl:template match="page">
		<!--choose your favorite-->
		<li><a href="{@file}" title="{@text}"><xsl:value-of select="@title" /></a></li>
<!--
		<li><a href="{@file}" title="{@title}"><xsl:value-of select="@text" /></a></li>
		<li><a href="{@file}"><xsl:value-of select="concat(@text,' :: ',@title)" /></a></li>
-->
		<ul>
			<!--apply templates for sub-pages recursively-->
			<xsl:apply-templates select="page" />
		</ul>
	</xsl:template>
</xsl:stylesheet>
