import { useDropzone } from "react-dropzone";
import { mediaAccept } from "../../entities/media/index.js";

/**
 * Drag-and-drop plus a native multi-file picker for media. The drop target
 * never opens the picker by click or keyboard (an explicit button calls
 * `open`), and files are validated by the upload queue, not the drop zone.
 */
export function useMediaDropzone({
  disabled,
  onFiles,
}: {
  readonly disabled: boolean;
  readonly onFiles: (files: readonly File[]) => void;
}) {
  const dropzone = useDropzone({
    disabled,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    noPaste: true,
    onDrop: (accepted) => {
      if (accepted.length > 0) onFiles(accepted);
    },
  });
  return {
    getInputProps: () =>
      dropzone.getInputProps({ accept: mediaAccept, "aria-label": "Upload images" }),
    getRootProps: dropzone.getRootProps,
    isDragActive: dropzone.isDragActive,
    open: dropzone.open,
  };
}
