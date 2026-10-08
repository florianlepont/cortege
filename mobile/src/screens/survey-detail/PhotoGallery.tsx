import { Fragment, ReactNode, useMemo } from "react"
import { ScrollView, useWindowDimensions, View } from "react-native"
import { useBrandTheme } from "../../app/theme"
import { createPhotoStyles, PHOTO_LAYOUT, PhotoSize, resolvePhotoSize } from "./photos.styles"

type PhotoGalleryProps = {
  /** One id per photo, in order (the React key of each tile). */
  ids: string[]
  renderPhoto: (id: string, index: number, size: PhotoSize) => ReactNode
}

/**
 * The photos of a survey page (12.2-14, D-27b): one photo is a full-width tile at 16:10, several are
 * a horizontal strip of 4:3 tiles 78 percent of the content width that snaps tile by tile and
 * bleeds to the screen edges, so the next tile peeks out. Used by the summary (`PhotosStrip`) and
 * the community page, which draw their own tile. Renders nothing without a photo.
 */
export function PhotoGallery({ ids, renderPhoto }: PhotoGalleryProps) {
  const theme = useBrandTheme()
  const styles = useMemo(() => createPhotoStyles(theme), [theme])
  const { width: windowWidth } = useWindowDimensions()
  if (ids.length === 0) return null

  const size = resolvePhotoSize(ids.length, windowWidth)
  const tiles = ids.map((id, index) => <Fragment key={id}>{renderPhoto(id, index, size)}</Fragment>)

  if (size.mode === "single") return <View testID="photo-gallery-single">{tiles}</View>

  return (
    <ScrollView
      horizontal
      testID="photo-gallery-strip"
      showsHorizontalScrollIndicator={false}
      snapToInterval={size.width + PHOTO_LAYOUT.gap}
      snapToAlignment="start"
      decelerationRate="fast"
      disableIntervalMomentum
      style={styles.strip}
      contentContainerStyle={styles.stripContent}
    >
      {tiles}
    </ScrollView>
  )
}
